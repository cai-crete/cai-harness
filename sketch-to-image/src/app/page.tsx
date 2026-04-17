'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type PointerEvent,
} from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { InfiniteGrid } from '@/components/InfiniteGrid';
import LeftToolbar from '@/components/LeftToolbar';
import AppHeader from '@/components/AppHeader';
import RightSidebar from '@/components/RightSidebar';
import { useBlueprintGeneration } from '@/hooks/useBlueprintGeneration';
import type { CanvasItem, CanvasMode, Point } from '@/types/canvas';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ZOOM_STEPS = [10, 25, 50, 75, 100, 125, 150, 175, 200] as const;
const ZOOM_MIN = 10;
const ZOOM_MAX = 200;
const ZOOM_WHEEL_FACTOR = 0.1;
const ZOOM_PINCH_FACTOR = 0.5;
const DEFAULT_PEN_STROKE_WIDTH = 2;
const DEFAULT_ERASER_STROKE_WIDTH = 20;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getTouchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: React.TouchList): Point {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

// ─────────────────────────────────────────────
// localStorage persistence
// ─────────────────────────────────────────────

const LS_ITEMS = 'cai-canvas-items';
const LS_VIEW = 'cai-canvas-view';
const LS_PIXELS = 'cai-pixel-data';

function lsLoadItems(): CanvasItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_ITEMS) || '[]'); }
  catch { return []; }
}

function lsLoadView(): { zoom: number; offset: Point } {
  if (typeof window === 'undefined') return { zoom: 100, offset: { x: 0, y: 0 } };
  try {
    const v = JSON.parse(localStorage.getItem(LS_VIEW) || '{}');
    return {
      zoom: typeof v.zoom === 'number' ? v.zoom : 100,
      offset: (v.offset && typeof v.offset.x === 'number') ? v.offset : { x: 0, y: 0 },
    };
  } catch { return { zoom: 100, offset: { x: 0, y: 0 } }; }
}

function lsLoadPixels(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_PIXELS) || '{}'); }
  catch { return {}; }
}

function lsSaveItems(items: CanvasItem[]) {
  try { localStorage.setItem(LS_ITEMS, JSON.stringify(items)); } catch { /* quota exceeded */ }
}

function lsSaveView(zoom: number, offset: Point) {
  try { localStorage.setItem(LS_VIEW, JSON.stringify({ zoom, offset })); } catch { /* quota exceeded */ }
}

function lsSavePixel(id: string, dataUrl: string) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_PIXELS) || '{}');
    map[id] = dataUrl;
    localStorage.setItem(LS_PIXELS, JSON.stringify(map));
  } catch { /* quota exceeded */ }
}

function lsDeletePixel(id: string) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_PIXELS) || '{}');
    delete map[id];
    localStorage.setItem(LS_PIXELS, JSON.stringify(map));
  } catch { /* quota exceeded */ }
}

// ─────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Canvas transform state
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [canvasOffset, setCanvasOffset] = useState<Point>({ x: 0, y: 0 });
  const canvasZoomRef = useRef(100);
  const canvasOffsetRef = useRef<Point>({ x: 0, y: 0 });

  const updateZoom = useCallback((z: number) => {
    const clamped = clamp(z, ZOOM_MIN, ZOOM_MAX);
    canvasZoomRef.current = clamped;
    setCanvasZoom(clamped);
  }, []);

  const updateOffset = useCallback((o: Point) => {
    canvasOffsetRef.current = o;
    setCanvasOffset(o);
  }, []);

  // Canvas mode & items
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const canvasItemsRef = useRef<CanvasItem[]>([]);
  useEffect(() => { canvasItemsRef.current = canvasItems; }, [canvasItems]);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const selectedItemIdsRef = useRef<string[]>([]);
  useEffect(() => { selectedItemIdsRef.current = selectedItemIds; }, [selectedItemIds]);

  // Toolbar state
  const [penStrokeWidth, setPenStrokeWidth] = useState(DEFAULT_PEN_STROKE_WIDTH);
  const [eraserStrokeWidth, setEraserStrokeWidth] = useState(DEFAULT_ERASER_STROKE_WIDTH);
  const [showStrokePanel, setShowStrokePanel] = useState<'pen' | 'eraser' | null>(null);

  // History state
  const [historyStates, setHistoryStates] = useState<CanvasItem[][]>([]);
  const [redoStates, setRedoStates] = useState<CanvasItem[][]>([]);

  // Focus mode toggle
  const [focusMode, setFocusMode] = useState<'all' | 'target'>('all');

  // Artboard upload (new artboard)
  const artboardFileInputRef = useRef<HTMLInputElement>(null);

  // Artboard image replace (control bar)
  const replaceArtboardFileInputRef = useRef<HTMLInputElement>(null);
  const pendingReplaceArtboardId = useRef<string | null>(null);

  // Sketch-to-Image panel state
  const [sketchPrompt, setSketchPrompt] = useState('');
  const [sketchMode, setSketchMode] = useState('');
  const [sketchStyle, setSketchStyle] = useState<string | null>(null);
  const [activeDetailStyle, setActiveDetailStyle] = useState<string | null>(null);
  const [sketchAspectRatio, setSketchAspectRatio] = useState<string | null>(null);
  const [sketchResolution, setSketchResolution] = useState('');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Blueprint generation hook
  const { isLoading: isGenerating, generatedImage, generate, reset: resetGeneration } = useBlueprintGeneration();

  const [generateWarning, setGenerateWarning] = useState<string | null>(null);

  // SVG cursor tracking for pen/eraser indicator
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });

  // Canvas refs
  const canvasElRef = useRef<HTMLDivElement>(null);
  const isDraggingPan = useRef(false);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const offsetAtDragStart = useRef<Point>({ x: 0, y: 0 });
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef<Point>({ x: 0, y: 0 });

  // Pixel drawing refs
  const artboardCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const activeArtboardId = useRef<string | null>(null);
  const lastDrawPoint = useRef<Point | null>(null);

  // Pixel undo/redo stacks (ImageData — synchronous restore)
  type PixelEntry = { id: string; data: ImageData };
  const pixelUndoStack = useRef<PixelEntry[]>([]);
  const pixelRedoStack = useRef<PixelEntry[]>([]);

  // Resize refs
  const isResizingItem = useRef(false);
  const resizeCorner = useRef({ dx: 1, dy: 1 });
  const resizeStart = useRef({ x: 0, y: 0, itemX: 0, itemY: 0, width: 0, height: 0 });

  // Move refs
  const isMovingItem = useRef(false);
  const moveItemId = useRef<string | null>(null);
  const moveStart = useRef({ ptX: 0, ptY: 0, itemX: 0, itemY: 0 });

  // ─── Place generated image onto canvas ───
  useEffect(() => {
    if (!generatedImage) return;

    const aspectMap: Record<string, { w: number; h: number }> = {
      '1:1': { w: 512, h: 512 },
      '4:3': { w: 640, h: 480 },
      '16:9': { w: 640, h: 360 },
    };
    const size = aspectMap[sketchAspectRatio ?? '4:3'] ?? { w: 640, h: 480 };

    const newItem: CanvasItem = {
      id: `generated-${Date.now()}`,
      type: 'sketch_generated',
      x: 60,
      y: -size.h / 2,
      width: size.w,
      height: size.h,
      src: `data:image/png;base64,${generatedImage}`,
      zIndex: canvasItems.length,
      sketchMode: (sketchMode as '' | 'CONCEPT' | 'DETAIL') || undefined,
      sketchStyle: sketchStyle ?? undefined,
      sketchAspectRatio: sketchAspectRatio ?? undefined,
      sketchResolution: sketchResolution || undefined,
    };

    setHistoryStates(h => [...h, canvasItems]);
    setCanvasItems(prev => [...prev, newItem]);
    resetGeneration();
    setSketchPrompt('');
    setSketchMode('');
    setSketchStyle(null);
    setSketchAspectRatio(null);
    setSketchResolution('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedImage]);

  // ─── Coordinate transform ───
  const getCanvasCoords = useCallback((clientX: number, clientY: number): Point => {
    const el = canvasElRef.current;
    const rect = el?.getBoundingClientRect()
      ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const scale = canvasZoomRef.current / 100;
    return {
      x: (clientX - rect.left - rect.width / 2 - canvasOffsetRef.current.x) / scale,
      y: (clientY - rect.top - rect.height / 2 - canvasOffsetRef.current.y) / scale,
    };
  }, []);

  // ─── Find artboard under cursor ───
  const findArtboardAt = useCallback((clientX: number, clientY: number): CanvasItem | null => {
    const pt = getCanvasCoords(clientX, clientY);
    return canvasItemsRef.current.find(item =>
      (item.type === 'artboard' || item.type === 'upload') &&
      pt.x >= item.x && pt.x <= item.x + item.width &&
      pt.y >= item.y && pt.y <= item.y + item.height
    ) ?? null;
  }, [getCanvasCoords]);

  // ─── Artboard-local pixel coordinates ───
  const getArtboardLocal = useCallback((clientX: number, clientY: number, artboard: CanvasItem): Point => {
    const pt = getCanvasCoords(clientX, clientY);
    return { x: pt.x - artboard.x, y: pt.y - artboard.y };
  }, [getCanvasCoords]);

  // ─── Wheel zoom (passive:false) ───
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const prevZoom = canvasZoomRef.current;
      const newZoom = clamp(prevZoom - e.deltaY * ZOOM_WHEEL_FACTOR, ZOOM_MIN, ZOOM_MAX);

      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const s = newZoom / prevZoom;
      updateZoom(newZoom);
      updateOffset({
        x: mouseX + (canvasOffsetRef.current.x - mouseX) * s,
        y: mouseY + (canvasOffsetRef.current.y - mouseY) * s,
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [updateZoom, updateOffset]);

  // ─── Zoom step control ───
  const handleZoomStep = useCallback((delta: number) => {
    if (delta > 0) {
      const next = ZOOM_STEPS.find(s => s > canvasZoomRef.current);
      if (next) updateZoom(next);
    } else {
      const prev = [...ZOOM_STEPS].reverse().find(s => s < canvasZoomRef.current);
      if (prev) updateZoom(prev);
    }
  }, [updateZoom]);

  // ─── Fit to view (2-mode toggle) ───
  const handleFocus = useCallback(() => {
    const el = canvasElRef.current;
    if (!el || canvasItems.length === 0) {
      updateZoom(100);
      updateOffset({ x: 0, y: 0 });
      return;
    }

    if (focusMode === 'all') {
      const padding = 100;
      const minX = Math.min(...canvasItems.map(i => i.x));
      const minY = Math.min(...canvasItems.map(i => i.y));
      const maxX = Math.max(...canvasItems.map(i => i.x + i.width));
      const maxY = Math.max(...canvasItems.map(i => i.y + i.height));
      const rect = el.getBoundingClientRect();
      const newZoom = clamp(
        Math.min(
          (rect.width - padding * 2) / (maxX - minX),
          (rect.height - padding * 2) / (maxY - minY),
          1
        ) * 100,
        ZOOM_MIN,
        ZOOM_MAX
      );
      updateZoom(newZoom);
      updateOffset({
        x: -((minX + maxX) / 2) * (newZoom / 100),
        y: -((minY + maxY) / 2) * (newZoom / 100),
      });
      setFocusMode('target');
    } else {
      const target = selectedItemIds[0]
        ? canvasItems.find(i => i.id === selectedItemIds[0])
        : canvasItems[canvasItems.length - 1];
      if (target) {
        const cx = target.x + target.width / 2;
        const cy = target.y + target.height / 2;
        updateZoom(100);
        updateOffset({ x: -cx, y: -cy });
      }
      setFocusMode('all');
    }
  }, [focusMode, canvasItems, selectedItemIds, updateZoom, updateOffset]);

  // ─── Artboard creation / upload ───
  const handleAddArtboard = useCallback(() => {
    let newX = -842 / 2;
    let newY = -595 / 2;

    if (canvasItems.length > 0) {
      const leftMost = canvasItems.reduce((p, c) => p.x < c.x ? p : c);
      const bottomMost = canvasItems.reduce((p, c) =>
        p.y + p.height > c.y + c.height ? p : c
      );
      newX = leftMost.x;
      newY = bottomMost.y + bottomMost.height + 40;
    }

    setHistoryStates(hs => [...hs, canvasItems]);
    setRedoStates([]);
    setCanvasItems(prev => [...prev, {
      id: `artboard-${Date.now()}`,
      type: 'artboard' as const,
      src: undefined,
      x: newX,
      y: newY,
      width: 842,
      height: 595,
      zIndex: canvasItems.length,
    }]);
  }, [canvasItems]);

  const handleArtboardImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 600;
        const ratio = img.height / img.width;
        const w = Math.min(img.width, maxW);
        const h = w * ratio;
        const newItem: CanvasItem = {
          id: `artboard-${Date.now()}`,
          type: 'artboard',
          x: -w / 2,
          y: -h / 2,
          width: w,
          height: h,
          src,
          zIndex: canvasItems.length,
        };
        setHistoryStates(hs => [...hs, canvasItems]);
        setCanvasItems(prev => [...prev, newItem]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [canvasItems]);

  // ─── Item actions (control bar) ───
  const handleDeleteItem = useCallback((id: string) => {
    setHistoryStates(h => [...h, canvasItemsRef.current]);
    setRedoStates([]);
    setCanvasItems(prev => prev.filter(i => i.id !== id));
    setSelectedItemIds(prev => prev.filter(s => s !== id));
  }, []);

  const handleDownloadItem = useCallback(async (item: CanvasItem) => {
    let downloadHref = item.src || '';

    if (item.type === 'artboard' || item.type === 'upload') {
      const sketchCanvas = artboardCanvasRefs.current.get(item.id);
      if (sketchCanvas) {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = item.width;
        exportCanvas.height = item.height;
        const ctx = exportCanvas.getContext('2d')!;

        // Fill background for artboard
        if (item.type === 'artboard') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, item.width, item.height);
        }

        // Draw background image if it has one
        if (item.src) {
          await new Promise<void>(resolve => {
            const bg = new Image();
            bg.onload = () => { ctx.drawImage(bg, 0, 0, item.width, item.height); resolve(); };
            bg.onerror = () => resolve();
            bg.src = item.src!;
          });
        }

        // Draw user sketches on top
        ctx.drawImage(sketchCanvas, 0, 0);
        downloadHref = exportCanvas.toDataURL('image/png');
      }
    }

    if (!downloadHref) return;

    const a = document.createElement('a');
    a.href = downloadHref;
    a.download = `${item.type}_${item.id}.png`;
    a.click();
  }, []);

  const handleReplaceArtboardImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = pendingReplaceArtboardId.current;
    if (!file || !id) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setHistoryStates(h => [...h, canvasItemsRef.current]);
      setCanvasItems(prev => prev.map(item => item.id === id ? { ...item, src } : item));
    };
    reader.readAsDataURL(file);
    pendingReplaceArtboardId.current = null;
    e.target.value = '';
  }, []);

  // ─── Pixel draw helpers ───
  const applyDrawSettings = (
    ctx: CanvasRenderingContext2D,
    mode: 'pen' | 'eraser',
    strokeWidth: number,
    color: string,
  ) => {
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;
    ctx.fillStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // ─── Pointer events ───
  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Resize handle detection
    if (canvasMode === 'select' && target.classList.contains('resize-handle')) {
      const dx = parseInt(target.dataset.dx ?? '1');
      const dy = parseInt(target.dataset.dy ?? '1');
      const item = canvasItemsRef.current.find(i => i.id === selectedItemIdsRef.current[0]);
      if (item) {
        setHistoryStates(h => [...h, canvasItemsRef.current]);
        setRedoStates([]);
        isResizingItem.current = true;
        resizeCorner.current = { dx, dy };
        const pt = getCanvasCoords(e.clientX, e.clientY);
        resizeStart.current = {
          x: pt.x, y: pt.y,
          itemX: item.x, itemY: item.y,
          width: item.width, height: item.height,
        };
        canvasElRef.current?.setPointerCapture(e.pointerId);
      }
      return;
    }

    // Item move (select mode — not on resize handle)
    if (canvasMode === 'select') {
      let el: HTMLElement | null = target;
      let itemId: string | null = null;
      while (el && el !== canvasElRef.current) {
        if (el.dataset.itemId) { itemId = el.dataset.itemId; break; }
        el = el.parentElement;
      }
      if (itemId) {
        const item = canvasItemsRef.current.find(i => i.id === itemId);
        if (item) {
          e.preventDefault();
          setSelectedItemIds([itemId]);
          setHistoryStates(h => [...h, canvasItemsRef.current]);
          setRedoStates([]);
          isMovingItem.current = true;
          moveItemId.current = itemId;
          const pt = getCanvasCoords(e.clientX, e.clientY);
          moveStart.current = { ptX: pt.x, ptY: pt.y, itemX: item.x, itemY: item.y };
          canvasElRef.current?.setPointerCapture(e.pointerId);
        }
      }
      return;
    }

    if (canvasMode === 'pan') {
      isDraggingPan.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetAtDragStart.current = { ...canvasOffsetRef.current };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      if (canvasElRef.current) canvasElRef.current.style.cursor = 'grabbing';
      return;
    }

    if (canvasMode === 'pen' || canvasMode === 'eraser') {
      const artboard = findArtboardAt(e.clientX, e.clientY);
      if (!artboard) return;

      const canvas = artboardCanvasRefs.current.get(artboard.id);
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      pixelUndoStack.current.push({ id: artboard.id, data: ctx.getImageData(0, 0, canvas.width, canvas.height) });
      pixelRedoStack.current = [];

      setHistoryStates(h => [...h, canvasItemsRef.current]);
      setRedoStates([]);

      activeArtboardId.current = artboard.id;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const pt = getArtboardLocal(e.clientX, e.clientY, artboard);
      applyDrawSettings(ctx, canvasMode, canvasMode === 'pen' ? penStrokeWidth : eraserStrokeWidth, '#111111');
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (canvasMode === 'pen' ? penStrokeWidth : eraserStrokeWidth) / 2, 0, Math.PI * 2);
      ctx.fill();
      lastDrawPoint.current = pt;
    }
  }, [canvasMode, findArtboardAt, getArtboardLocal, getCanvasCoords, penStrokeWidth, eraserStrokeWidth]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Update SVG cursor position
    if (canvasMode === 'pen' || canvasMode === 'eraser') {
      setLastMousePos(getCanvasCoords(e.clientX, e.clientY));
    }

    // Item move drag
    if (isMovingItem.current && moveItemId.current) {
      const pt = getCanvasCoords(e.clientX, e.clientY);
      const dx = pt.x - moveStart.current.ptX;
      const dy = pt.y - moveStart.current.ptY;
      setCanvasItems(prev => prev.map(i =>
        i.id === moveItemId.current
          ? { ...i, x: moveStart.current.itemX + dx, y: moveStart.current.itemY + dy }
          : i
      ));
      return;
    }

    // Resize drag
    if (isResizingItem.current && selectedItemIdsRef.current.length === 1) {
      const pt = getCanvasCoords(e.clientX, e.clientY);
      const { x: startX, itemX, itemY, width: startW, height: startH } = resizeStart.current;
      const { dx, dy } = resizeCorner.current;
      const aspect = startW / startH;
      const deltaX = (pt.x - startX) * dx;
      const newWidth = Math.max(startW + deltaX, 50);
      const newHeight = newWidth / aspect;
      const newX = dx === -1 ? itemX + (startW - newWidth) : itemX;
      const newY = dy === -1 ? itemY + (startH - newHeight) : itemY;
      setCanvasItems(prev => prev.map(i =>
        i.id === selectedItemIdsRef.current[0]
          ? { ...i, x: newX, y: newY, width: newWidth, height: newHeight }
          : i
      ));
      return;
    }

    if (canvasMode === 'pan' && isDraggingPan.current) {
      updateOffset({
        x: offsetAtDragStart.current.x + e.clientX - dragStart.current.x,
        y: offsetAtDragStart.current.y + e.clientY - dragStart.current.y,
      });
      return;
    }

    if ((canvasMode === 'pen' || canvasMode === 'eraser') && activeArtboardId.current) {
      const artboard = canvasItemsRef.current.find(i => i.id === activeArtboardId.current);
      if (!artboard || !lastDrawPoint.current) return;
      const canvas = artboardCanvasRefs.current.get(artboard.id);
      if (!canvas) return;

      const pt = getArtboardLocal(e.clientX, e.clientY, artboard);
      const ctx = canvas.getContext('2d')!;
      const sw = canvasMode === 'pen' ? penStrokeWidth : eraserStrokeWidth;
      applyDrawSettings(ctx, canvasMode, sw, '#111111');
      ctx.beginPath();
      ctx.moveTo(lastDrawPoint.current.x, lastDrawPoint.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      lastDrawPoint.current = pt;
    }
  }, [canvasMode, getCanvasCoords, getArtboardLocal, penStrokeWidth, eraserStrokeWidth, updateOffset]);

  const handlePointerUp = useCallback(() => {
    if (isMovingItem.current) {
      isMovingItem.current = false;
      moveItemId.current = null;
      return;
    }
    if (isResizingItem.current) {
      isResizingItem.current = false;
      return;
    }
    if (isDraggingPan.current) {
      isDraggingPan.current = false;
      if (canvasElRef.current) canvasElRef.current.style.cursor = 'grab';
      return;
    }
    activeArtboardId.current = null;
    lastDrawPoint.current = null;
  }, []);

  // ─── Touch events (pinch zoom + two-finger pan) ───
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = getTouchDistance(e.touches);
      lastTouchCenter.current = getTouchCenter(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const el = canvasElRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dist = getTouchDistance(e.touches);
    const center = getTouchCenter(e.touches);
    const prevZoom = canvasZoomRef.current;
    const newZoom = clamp(prevZoom + (dist - lastTouchDist.current) * ZOOM_PINCH_FACTOR, ZOOM_MIN, ZOOM_MAX);
    const s = newZoom / prevZoom;
    const cx = center.x - rect.left - rect.width / 2;
    const cy = center.y - rect.top - rect.height / 2;
    updateZoom(newZoom);
    updateOffset({
      x: cx + (canvasOffsetRef.current.x - cx) * s + (center.x - lastTouchCenter.current.x),
      y: cy + (canvasOffsetRef.current.y - cy) * s + (center.y - lastTouchCenter.current.y),
    });
    lastTouchDist.current = dist;
    lastTouchCenter.current = center;
  }, [updateZoom, updateOffset]);

  // ─── handleGenerate — selected item only ───
  const handleGenerate = useCallback(async () => {
    if (!sketchMode || !sketchStyle || !sketchAspectRatio || !sketchResolution) return;

    const selectedId = selectedItemIdsRef.current[0];
    const item = selectedId ? canvasItemsRef.current.find(i => i.id === selectedId) : null;

    if (!item || (item.type !== 'artboard' && item.type !== 'upload' && item.type !== 'sketch_generated')) {
      setGenerateWarning('스케치를 선택하세요');
      setTimeout(() => setGenerateWarning(null), 1500);
      return;
    }

    let sketchBase64: string;

    if (item.type === 'sketch_generated') {
      // Generated image: use src directly
      const match = item.src?.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return;
      sketchBase64 = match[2];
    } else {
      // Artboard: composite uploaded image + sketch drawing
      const sketchCanvas = artboardCanvasRefs.current.get(item.id);
      if (!sketchCanvas) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = item.width;
      exportCanvas.height = item.height;
      const ctx = exportCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, item.width, item.height);

      if (item.src) {
        await new Promise<void>(resolve => {
          const bg = new Image();
          bg.onload = () => { ctx.drawImage(bg, 0, 0, item.width, item.height); resolve(); };
          bg.onerror = () => resolve();
          bg.src = item.src!;
        });
      }

      ctx.drawImage(sketchCanvas, 0, 0);
      sketchBase64 = exportCanvas.toDataURL('image/png').split(',')[1];
    }

    await generate(
      { current: null },
      `data:image/png;base64,${sketchBase64}`,
      {
        userPrompt: sketchPrompt,
        vizMode: sketchMode,
        styleMode: sketchStyle,
        resolution: sketchResolution,
        aspectRatio: sketchAspectRatio,
      }
    );
  }, [sketchMode, sketchStyle, sketchAspectRatio, sketchResolution, sketchPrompt, generate]);

  // ─── Sync selected item → panel ───
  useEffect(() => {
    if (selectedItemIds.length !== 1) return;
    const item = canvasItems.find(i => i.id === selectedItemIds[0]);
    if (!item) return;
    if (item.sketchMode) setSketchMode(item.sketchMode);
    if (item.sketchStyle) setSketchStyle(item.sketchStyle);
    if (item.sketchAspectRatio) setSketchAspectRatio(item.sketchAspectRatio);
    if (item.sketchResolution) setSketchResolution(item.sketchResolution);
  }, [selectedItemIds, canvasItems]);

  // ─── Undo / Redo ───
  const handleUndo = useCallback(() => {
    if (pixelUndoStack.current.length > 0) {
      const entry = pixelUndoStack.current.pop()!;
      const canvas = artboardCanvasRefs.current.get(entry.id);
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        pixelRedoStack.current.push({ id: entry.id, data: current });
        ctx.putImageData(entry.data, 0, 0);
      }
      setHistoryStates(h => h.slice(0, -1));
      setRedoStates(r => [...r, canvasItemsRef.current]);
      return;
    }
    if (historyStates.length === 0) return;
    const prev = historyStates[historyStates.length - 1];
    setRedoStates(r => [...r, canvasItems]);
    setCanvasItems(prev);
    setHistoryStates(h => h.slice(0, -1));
  }, [historyStates, canvasItems]);

  const handleRedo = useCallback(() => {
    if (pixelRedoStack.current.length > 0) {
      const entry = pixelRedoStack.current.pop()!;
      const canvas = artboardCanvasRefs.current.get(entry.id);
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        pixelUndoStack.current.push({ id: entry.id, data: current });
        ctx.putImageData(entry.data, 0, 0);
      }
      setRedoStates(r => r.slice(0, -1));
      setHistoryStates(h => [...h, canvasItemsRef.current]);
      return;
    }
    if (redoStates.length === 0) return;
    const next = redoStates[redoStates.length - 1];
    setHistoryStates(h => [...h, canvasItems]);
    setCanvasItems(next);
    setRedoStates(r => r.slice(0, -1));
  }, [redoStates, canvasItems]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') setCanvasMode('select');
      if (e.key === 'h' || e.key === 'H') setCanvasMode('pan');
      if (e.key === 'p' || e.key === 'P') setCanvasMode('pen');
      if (e.key === 'e' || e.key === 'E') setCanvasMode('eraser');
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
      if (e.key === '0') handleFocus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo, handleFocus]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  const scale = canvasZoom / 100;
  const bg = theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]';

  // Shared transform style — reused across all canvas-space overlays
  const canvasTransformStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  };

  // Icon size (screen pixels), zoom-compensated for canvas space
  // barScale clamped to 50%–150% so the bar doesn't grow/shrink beyond readable range
  const barScale = clamp(scale, 0.5, 1.5);
  const ctrlIconSize = 16 / barScale;
  const ctrlBtnSize = 32 / barScale;
  const ctrlBarH = 44 / barScale;
  const ctrlGap = 6 / barScale;
  const ctrlPadX = 8 / barScale;

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden font-sans ${bg}`}>

      <AppHeader theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />

      {/* Main area */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* Left toolbar */}
        <LeftToolbar
          canvasMode={canvasMode}
          setCanvasMode={setCanvasMode}
          theme={theme}
          penStrokeWidth={penStrokeWidth}
          setPenStrokeWidth={setPenStrokeWidth}
          eraserStrokeWidth={eraserStrokeWidth}
          setEraserStrokeWidth={setEraserStrokeWidth}
          showStrokePanel={showStrokePanel}
          setShowStrokePanel={setShowStrokePanel}
          historyStates={historyStates}
          redoStates={redoStates}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canvasZoom={canvasZoom}
          onZoomStep={handleZoomStep}
          onFocus={handleFocus}
          canvasItems={canvasItems}
          onAddArtboard={handleAddArtboard}
          artboardFileInputRef={artboardFileInputRef}
          onArtboardImageUpload={handleArtboardImageUpload}
        />

        {/* Canvas area */}
        <div
          ref={canvasElRef}
          className="flex-1 relative overflow-hidden"
          style={{
            cursor: canvasMode === 'pan' ? 'grab'
              : (canvasMode === 'pen' || canvasMode === 'eraser') ? 'none'
                : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <InfiniteGrid zoom={canvasZoom} offset={canvasOffset} theme={theme} />

          {/* Deselect backdrop — first child = lowest z-order, items sit above it */}
          <div className="absolute inset-0" onClick={() => setSelectedItemIds([])} />

          {/* ── Items layer ── */}
          <div className="absolute inset-0 pointer-events-none">
            <div style={canvasTransformStyle}>
              {canvasItems.map(item => (
                <div
                  key={item.id}
                  className="absolute"
                  data-item-id={item.id}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    zIndex: item.zIndex,
                    background: item.type === 'artboard' ? '#ffffff' : 'transparent',
                    border: '1px solid #dddddd',
                    pointerEvents: (isGenerating || canvasMode !== 'select') ? 'none' : 'all',
                    cursor: canvasMode === 'select' ? 'default' : 'inherit',
                  }}
                  onClick={e => { e.stopPropagation(); setSelectedItemIds([item.id]); }}
                >
                  {item.src && (
                    <img src={item.src} alt="" className="w-full h-full object-cover" draggable={false} />
                  )}
                  {item.text && (
                    <div className="p-1 text-sm">{item.text}</div>
                  )}

                  {/* Pixel sketch canvas overlay */}
                  {(item.type === 'artboard' || item.type === 'upload') && (
                    <canvas
                      ref={el => {
                        if (el) {
                          artboardCanvasRefs.current.set(item.id, el);
                          if (el.width !== Math.round(item.width)) el.width = Math.round(item.width);
                          if (el.height !== Math.round(item.height)) el.height = Math.round(item.height);
                        } else {
                          artboardCanvasRefs.current.delete(item.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Pen / Eraser SVG cursor indicator */}
              {(canvasMode === 'pen' || canvasMode === 'eraser') && (
                <svg
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }}
                >
                  <circle
                    cx={lastMousePos.x}
                    cy={lastMousePos.y}
                    r={canvasMode === 'pen' ? penStrokeWidth / 2 : eraserStrokeWidth / 2}
                    fill={canvasMode === 'pen' ? (theme === 'dark' ? '#ffffff' : '#111111') : 'none'}
                    stroke={theme === 'dark' ? '#ffffff' : '#111111'}
                    strokeWidth={canvasMode === 'eraser' ? 1 / scale : 0}
                    opacity={0.6}
                  />
                </svg>
              )}
            </div>
          </div>

          {/* ── Selection border + floating control bar — z-[105] ── */}
          {selectedItemIds.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-[105]">
              <div style={canvasTransformStyle}>
                {selectedItemIds.map(id => {
                  const item = canvasItems.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div
                      key={`sel-${id}`}
                      style={{
                        position: 'absolute',
                        left: item.x - 1,
                        top: item.y - 1,
                        width: item.width + 2,
                        height: item.height + 2,
                        borderWidth: `${1.6 / scale}px`,
                        borderStyle: 'solid',
                        borderColor: '#1d4ed8',
                      }}
                    >
                      {/* Floating control bar */}
                      <div
                        style={{
                          position: 'absolute',
                          top: `${-56 / barScale}px`,
                          right: 0,
                          height: `${ctrlBarH}px`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: `${ctrlGap}px`,
                          padding: `0 ${ctrlPadX}px`,
                          background: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: `${999 / barScale}px`,
                          border: `${1 / barScale}px solid rgba(0,0,0,0.08)`,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                          pointerEvents: 'auto',
                          whiteSpace: 'nowrap',
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* sketch_generated: Edit (+) → promote to upload */}
                        {item.type === 'sketch_generated' && (
                          <button
                            title="편집 (스케치 가능 상태로 승격)"
                            style={{
                              width: `${ctrlBtnSize}px`,
                              height: `${ctrlBtnSize}px`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: `${999 / barScale}px`,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                            }}
                            onClick={() => {
                              setHistoryStates(h => [...h, canvasItemsRef.current]);
                              setRedoStates([]);
                              setCanvasItems(prev => prev.map(i =>
                                i.id === id ? { ...i, type: 'upload' as const } : i
                              ));
                              setCanvasMode('pen');
                            }}
                          >
                            <Plus style={{ width: `${ctrlIconSize}px`, height: `${ctrlIconSize}px` }} />
                          </button>
                        )}

                        {/* Download (For any item with src, or any artboard/upload with sketches) */}
                        {(item.src || item.type === 'artboard' || item.type === 'upload') && (
                          <button
                            title="Download"
                            style={{
                              width: `${ctrlBtnSize}px`,
                              height: `${ctrlBtnSize}px`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: `${999 / barScale}px`,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                            }}
                            onClick={() => handleDownloadItem(item)}
                          >
                            <Download style={{ width: `${ctrlIconSize}px`, height: `${ctrlIconSize}px` }} />
                          </button>
                        )}

                        {/* artboard: Replace image */}
                        {item.type === 'artboard' && (
                          <button
                            title="Upload image"
                            style={{
                              width: `${ctrlBtnSize}px`,
                              height: `${ctrlBtnSize}px`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: `${999 / barScale}px`,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                            }}
                            onClick={() => {
                              pendingReplaceArtboardId.current = id;
                              replaceArtboardFileInputRef.current?.click();
                            }}
                          >
                            <Upload style={{ width: `${ctrlIconSize}px`, height: `${ctrlIconSize}px` }} />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          title="Delete"
                          style={{
                            width: `${ctrlBtnSize}px`,
                            height: `${ctrlBtnSize}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: `${999 / barScale}px`,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: '#ef4444',
                          }}
                          onClick={() => handleDeleteItem(id)}
                        >
                          <Trash2 style={{ width: `${ctrlIconSize}px`, height: `${ctrlIconSize}px` }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Resize handles — z-[115], sketch_generated only ── */}
          {selectedItemIds.length === 1 && (() => {
            const item = canvasItems.find(i => i.id === selectedItemIds[0]);
            if (!item || item.type === 'artboard') return null;
            const hSize = 12 / scale;
            const hBorder = 1.6 / scale;
            return (
              <div className="absolute inset-0 pointer-events-none z-[115]">
                <div style={canvasTransformStyle}>
                  {[
                    { dx: -1, dy: -1, cursor: 'nwse-resize', x: item.x - hSize / 2, y: item.y - hSize / 2 },
                    { dx: 1, dy: -1, cursor: 'nesw-resize', x: item.x + item.width - hSize / 2, y: item.y - hSize / 2 },
                    { dx: -1, dy: 1, cursor: 'nesw-resize', x: item.x - hSize / 2, y: item.y + item.height - hSize / 2 },
                    { dx: 1, dy: 1, cursor: 'nwse-resize', x: item.x + item.width - hSize / 2, y: item.y + item.height - hSize / 2 },
                  ].map((pos, idx) => (
                    <div
                      key={`rh-${idx}`}
                      className="resize-handle"
                      data-dx={pos.dx}
                      data-dy={pos.dy}
                      style={{
                        position: 'absolute',
                        left: pos.x,
                        top: pos.y,
                        width: hSize,
                        height: hSize,
                        borderWidth: hBorder,
                        borderStyle: 'solid',
                        backgroundColor: 'white',
                        borderColor: '#808080',
                        borderRadius: '999px',
                        pointerEvents: 'auto',
                        cursor: pos.cursor,
                      }}
                      onPointerDown={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        setHistoryStates(h => [...h, canvasItemsRef.current]);
                        setRedoStates([]);
                        isResizingItem.current = true;
                        resizeCorner.current = { dx: pos.dx, dy: pos.dy };
                        const pt = getCanvasCoords(e.clientX, e.clientY);
                        resizeStart.current = {
                          x: pt.x, y: pt.y,
                          itemX: item.x, itemY: item.y,
                          width: item.width, height: item.height,
                        };
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Hidden file input for artboard image replacement */}
          <input
            type="file"
            ref={replaceArtboardFileInputRef}
            onChange={handleReplaceArtboardImage}
            accept="image/*"
            className="hidden"
          />
        </div>

        <RightSidebar
          isRightPanelOpen={isRightPanelOpen}
          setIsRightPanelOpen={setIsRightPanelOpen}
          isGenerating={isGenerating}
          generateWarning={generateWarning}
          sketchPrompt={sketchPrompt}
          setSketchPrompt={setSketchPrompt}
          sketchMode={sketchMode}
          setSketchMode={setSketchMode}
          sketchStyle={sketchStyle}
          setSketchStyle={setSketchStyle}
          activeDetailStyle={activeDetailStyle}
          setActiveDetailStyle={setActiveDetailStyle}
          aspectRatio={sketchAspectRatio}
          setAspectRatio={setSketchAspectRatio}
          resolution={sketchResolution}
          setResolution={setSketchResolution}
          handleGenerate={handleGenerate}
        />
      </div>

      {/* Status bar */}
      <div className={`h-7 flex items-center px-4 gap-4 text-[0.6875rem] text-gray-400 shrink-0 border-t border-gray-200 ${theme === 'dark' ? 'bg-[#111]' : 'bg-white'}`}>
        <span>Mode: <b className="text-gray-600">{canvasMode.toUpperCase()}</b></span>
        <span>Zoom: <b className="text-gray-600">{Math.round(canvasZoom)}%</b></span>
        <span>Items: <b className="text-gray-600">{canvasItems.length}</b></span>
        <span>Selected: <b className="text-gray-600">{selectedItemIds.length}</b></span>
        <span className="ml-auto">V: select · H: pan · P: pen · E: eraser · Ctrl+Z: undo · 0: fit</span>
      </div>
    </div>
  );
}
