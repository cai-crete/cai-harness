---
id: N11
title: Canvas Interaction 개선 — 선택/리사이즈/컨트롤바/커서 + px→rem 변환
date: 2026-04-17
status: active
---

## 목표

1. px → rem 단위 일괄 변환 (UI 고정 크기값)
2. 아이템 선택 버그 수정 (deselect div가 클릭 가로챔)
3. 선택 테두리 zoom 보정 (1.6/scale px, z-[105])
4. 리사이즈 핸들 구현 (4코너, sketch_generated 전용)
5. 플로팅 컨트롤바 (아이템 위 — Upload/Download/Delete)
6. pen/eraser SVG 커서 인디케이터

---

## A. px → rem 변환 규칙

기준: 16px = 1rem

| px   | rem         |
|------|-------------|
| 10   | 0.625rem    |
| 11   | 0.6875rem   |
| 12   | 0.75rem     |
| 13   | 0.8125rem   |
| 14   | 0.875rem    |
| 15   | 0.9375rem   |
| 16   | 1rem        |
| 36   | 2.25rem     |
| 44   | 2.75rem     |
| 54   | 3.375rem    |
| 56   | 3.5rem      |
| 150  | 9.375rem    |
| 200  | 12.5rem     |
| 284  | 17.75rem    |

**변환 제외:**
- `1px` border/divider (항상 1px)
- 캔버스 논리 좌표 (842, 595, 40, 60, 512 등)
- zoom-compensated 내부값 (`1.6 / scale` 등)
- Lucide icon `size={N}` (SVG 내부 단위)

### 파일별 변환 항목

**AppHeader.tsx:**
- `h-[54px]` → `h-[3.375rem]`

**LeftToolbar.tsx:**
- `left-[12px]` → `left-[0.75rem]`
- `left-[calc(100%+12px)]` → `left-[calc(100%+0.75rem)]`
- `text-[10px]` → `text-[0.625rem]`

**RightSidebar.tsx:**
- `p-[12px]` → `p-[0.75rem]`
- `w-[284px]` → `w-[17.75rem]`
- `h-[44px]` → `h-[2.75rem]` (×2)
- `gap-[12px]` → `gap-[0.75rem]`
- `mb-[12px]` → `mb-[0.75rem]`
- `text-[15px]` → `text-[0.9375rem]`
- `top-[56px]` → `top-[3.5rem]`

**SketchToImagePanel.tsx:**
- `h-[44px]` → `h-[2.75rem]` (×4)
- `text-[14px]` → `text-[0.875rem]` (×2)
- `h-[150px]` → `h-[9.375rem]`
- `rounded-[12px]` → `rounded-[0.75rem]`
- `text-[13px]` → `text-[0.8125rem]`
- `h-[200px]` → `h-[12.5rem]`
- `text-[11px]` → `text-[0.6875rem]`
- `h-[36px]` → `h-[2.25rem]` (×2)
- `text-[12px]` → `text-[0.75rem]` (×2)
- `text-[16px]` → `text-[1rem]`
- `text-[10px]` → `text-[0.625rem]`
- `rounded-[20px]` → `rounded-[1.25rem]`

**page.tsx:**
- `text-[11px]` → `text-[0.6875rem]` (status bar)

---

## B. 캔버스 인터랙션 구현 (page.tsx)

### B1. 선택 버그 수정
- **원인**: deselect div(`absolute inset-0`)가 items 컨테이너보다 DOM 순서상 뒤에 위치
  → z-order 상 위에 렌더링되어 모든 클릭 가로챔
- **수정**: deselect div를 canvas area의 **첫 번째 자식**으로 이동 (items보다 낮은 z-order)

### B2. 선택 테두리 (zoom 보정)
- z-[105] 별도 overlay 추가 (items layer와 분리)
- 각 선택된 아이템에 `borderWidth: ${1.6 / scale}px` 적용
- 아이템 div의 하드코딩 `2px solid #0099ff` border 제거 → `1px solid #dddddd` 유지

### B3. 리사이즈 핸들
- sketch_generated 타입만 핸들 표시 (artboard 제외 — canvas 콘텐츠 손실 방지)
- z-[115] overlay, 4코너 각 `12/scale px` 크기
- `className="resize-handle"`, `data-dx`, `data-dy` attribute로 방향 식별
- handlePointerDown에서 `.resize-handle` 클래스 감지 → resize 시작
- handlePointerMove에서 aspect ratio 고정 리사이즈 (width 드리이브, height 추종)
- handlePointerUp에서 resize 종료

### B4. 플로팅 컨트롤바
- 선택 테두리 div 내부, `top: -56/scale px`
- zoom 역보정: 버튼 크기/gap/radius 모두 `/scale` 적용
- 타입별 버튼:
  - `artboard`: Upload(이미지 교체) + Download(src 있을 때) + Delete
  - `sketch_generated`: Download + Delete
- `replaceArtboardFileInputRef` + `pendingReplaceArtboardId` ref 추가

### B5. SVG 커서 인디케이터
- `lastMousePos` useState 추가
- handlePointerMove에서 pen/eraser 시 `setLastMousePos(getCanvasCoords(...))`
- transform div 내부에 SVG `<circle>` 렌더링
  - pen: fill circle, r = penStrokeWidth/2
  - eraser: stroke-only circle, r = eraserStrokeWidth/2, strokeWidth = 1/scale
- pen/eraser 모드일 때 CSS cursor `'none'`으로 변경

---

## 파일 목록

- `sketch-to-image/src/components/AppHeader.tsx`
- `sketch-to-image/src/components/LeftToolbar.tsx`
- `sketch-to-image/src/components/RightSidebar.tsx`
- `sketch-to-image/src/components/panels/SketchToImagePanel.tsx`
- `sketch-to-image/src/app/page.tsx`
