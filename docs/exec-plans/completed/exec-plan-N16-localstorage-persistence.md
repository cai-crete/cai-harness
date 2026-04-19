# exec-plan-N16 — 새로고침 후 작업 내역 유지 (localStorage 영속성)

## 목표
새로고침(F5) 후에도 캔버스 아이템, 뷰포트, 픽셀 드로잉이 모두 복원된다.

---

## 대상 상태

| 상태 | 타입 | 저장 방식 |
|------|------|-----------|
| `canvasItems` | `CanvasItem[]` | JSON 직렬화 → `cai-canvas-items` |
| `canvasZoom`, `canvasOffset` | number, Point | JSON → `cai-canvas-view` |
| 픽셀 캔버스 드로잉 | HTMLCanvas (artboard/upload 위) | `.toDataURL()` → `cai-pixel-data` (id→dataURL map) |

히스토리 스택(`historyStates`, `redoStates`, pixelUndo/Redo)은 **복원 불필요** — 새로고침 후 깨끗하게 시작.

---

## 구현 상세

### 1. 저장 (page.tsx 내 useEffect 추가)

```ts
// canvasItems 변경 시 저장
useEffect(() => {
  try { localStorage.setItem('cai-canvas-items', JSON.stringify(canvasItems)); }
  catch { /* 용량 초과 무시 */ }
}, [canvasItems]);

// zoom/offset 변경 시 저장
useEffect(() => {
  try { localStorage.setItem('cai-canvas-view', JSON.stringify({ zoom: canvasZoom, offset: canvasOffset })); }
  catch {}
}, [canvasZoom, canvasOffset]);
```

### 2. 픽셀 캔버스 저장 (스트로크 완료 시)

드로잉 pointerUp 핸들러 마지막에:
```ts
// 해당 artboard의 픽셀 데이터를 localStorage에 저장
const canvas = artboardCanvasRefs.current.get(activeArtboardId.current!);
if (canvas) {
  const pixelData = JSON.parse(localStorage.getItem('cai-pixel-data') || '{}');
  pixelData[activeArtboardId.current!] = canvas.toDataURL('image/png');
  try { localStorage.setItem('cai-pixel-data', JSON.stringify(pixelData)); } catch {}
}
```

### 3. 복원 (마운트 시)

```ts
// canvasItems 초기값
const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(() => {
  try { return JSON.parse(localStorage.getItem('cai-canvas-items') || '[]'); }
  catch { return []; }
});

// zoom/offset 초기값
const [canvasZoom, setCanvasZoom] = useState(() => {
  try { return JSON.parse(localStorage.getItem('cai-canvas-view') || '{}').zoom ?? 100; }
  catch { return 100; }
});
const [canvasOffset, setCanvasOffset] = useState<Point>(() => {
  try { return JSON.parse(localStorage.getItem('cai-canvas-view') || '{}').offset ?? { x: 0, y: 0 }; }
  catch { return { x: 0, y: 0 }; }
});
```

### 4. 픽셀 캔버스 복원

`pendingPixelRestore` ref에 localStorage 픽셀 데이터를 마운트 시 로드:
```ts
const pendingPixelRestore = useRef<Record<string, string>>({});
// 마운트 시 1회
useEffect(() => {
  try { pendingPixelRestore.current = JSON.parse(localStorage.getItem('cai-pixel-data') || '{}'); }
  catch {}
}, []);
```

artboard canvas의 ref 콜백(또는 useEffect)에서 복원:
```ts
// artboardCanvasRefs에 canvas가 등록될 때 pendingPixelRestore 확인
const registerArtboardCanvas = useCallback((id: string, canvas: HTMLCanvasElement | null) => {
  if (!canvas) { artboardCanvasRefs.current.delete(id); return; }
  artboardCanvasRefs.current.set(id, canvas);
  const dataUrl = pendingPixelRestore.current[id];
  if (dataUrl) {
    const img = new Image();
    img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0);
    img.src = dataUrl;
    delete pendingPixelRestore.current[id];
  }
}, []);
```

### 5. 아이템 삭제 시 pixel data도 정리

아이템 삭제 핸들러에서:
```ts
const pixelData = JSON.parse(localStorage.getItem('cai-pixel-data') || '{}');
deletedIds.forEach(id => delete pixelData[id]);
localStorage.setItem('cai-pixel-data', JSON.stringify(pixelData));
```

---

## 파일 수정 대상

- `sketch-to-image/src/app/page.tsx` — 위 로직 전체 적용

---

## 검증

1. 아이템 추가 → F5 → 아이템 유지
2. 드로잉 후 F5 → 픽셀 드로잉 유지
3. zoom/pan 후 F5 → 뷰포트 유지
4. 아이템 삭제 후 F5 → 삭제된 아이템 없음
5. 생성된 이미지(sketch_generated) F5 → 유지
