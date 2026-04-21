# exec-plan N33 — 아트보드 grid 중앙 정렬 + 잠금 상태 컨텐츠 패닝

## 목표
1. 아트보드 내 grid를 artboard 중앙 기준으로 정렬
2. 아트보드 이동 잠금(locked) + pan 모드 시 아트보드 내부 컨텐츠 패닝 가능
3. GENERATE 시 contentScale/contentOffset 무관하게 항상 전체 캔버스(100% 기준) 전송

---

## 현황 분석

### Task 1: Grid backgroundPosition
- 파일: `sketch-to-image/src/app/page.tsx` line ~1122
- 현재: `backgroundPosition: '0 0, 0 0, 0 0, 0 0'` → top-left 기준 정렬
- 문제: artboard 크기가 60px의 배수가 아닐 때 중앙에 grid 교차점이 없음
- 해결: `'center center, center center, center center, center center'` 로 변경

### Task 2: 컨텐츠 패닝 (locked artboard + pan mode)
- `CanvasItem`에 `contentOffset?: { x: number; y: number }` 미존재
- 현재 artboard content div: `transform: scale(contentScale/100), transformOrigin: top left`
- 컨텐츠 패닝 없음 → contentScale > 100% 시 왼쪽 상단 고정, 나머지 영역 탐색 불가
- GENERATE(`handleGenerate`) 내 export는 sketch canvas 전체 픽셀을 사용하므로 contentOffset 무관하게 정상 동작 (검증 후 주석 추가)

---

## 구현 계획

### N33-1: Grid center 정렬
**파일**: `sketch-to-image/src/app/page.tsx`
**변경**: 아트보드 grid div의 `backgroundPosition` 수정
```diff
- backgroundPosition: '0 0, 0 0, 0 0, 0 0',
+ backgroundPosition: 'center center, center center, center center, center center',
```

### N33-2: CanvasItem 타입 확장
**파일**: `sketch-to-image/src/types/canvas.ts`
**변경**: `contentOffset` 필드 추가
```diff
+ contentOffset?: { x: number; y: number };
  contentScale?: number;
```

### N33-3: Artboard content div transform 수정
**파일**: `sketch-to-image/src/app/page.tsx` — artboard content div
**변경**: contentOffset을 translate로 반영
```diff
- transform: `scale(${(item.contentScale ?? 100) / 100})`,
+ transform: `translate(${(item.contentOffset?.x ?? 0)}px, ${(item.contentOffset?.y ?? 0)}px) scale(${(item.contentScale ?? 100) / 100})`,
  transformOrigin: 'top left',
```

### N33-4: 컨텐츠 패닝 refs + 로직 추가
**파일**: `sketch-to-image/src/app/page.tsx`

#### 추가할 refs
```ts
const isContentPanning = useRef(false);
const contentPanArtboardId = useRef<string | null>(null);
const contentPanStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
```

#### handlePointerDown — pan mode 내 변경
pan 모드(`canvasMode === 'pan'`)에서 포인터다운 시:
1. `findArtboardAt(e.clientX, e.clientY)`로 locked artboard 감지
2. locked artboard 위라면 → `isContentPanning = true`, `contentPanArtboardId` 설정, `contentPanStartOffset` = 현재 artboard.contentOffset
3. locked artboard가 아니면 → 기존 canvas pan 로직 유지

```ts
// pan mode 내 추가 (기존 isDraggingPan 세팅 전)
const hoveredArtboard = findArtboardAt(e.clientX, e.clientY);
if (hoveredArtboard?.locked) {
  isContentPanning.current = true;
  contentPanArtboardId.current = hoveredArtboard.id;
  contentPanStartOffset.current = hoveredArtboard.contentOffset ?? { x: 0, y: 0 };
  dragStart.current = { x: e.clientX, y: e.clientY };
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  if (canvasElRef.current) canvasElRef.current.style.cursor = 'grabbing';
  return; // canvas pan 차단
}
```

#### handlePointerMove — 컨텐츠 패닝 처리 추가
```ts
if (isContentPanning.current && contentPanArtboardId.current) {
  const artboard = canvasItemsRef.current.find(i => i.id === contentPanArtboardId.current);
  if (artboard) {
    const s = (artboard.contentScale ?? 100) / 100;
    const maxPanX = -(artboard.width * (s - 1));
    const maxPanY = -(artboard.height * (s - 1));
    const rawX = contentPanStartOffset.current.x + (e.clientX - dragStart.current.x);
    const rawY = contentPanStartOffset.current.y + (e.clientY - dragStart.current.y);
    setCanvasItems(prev => prev.map(i =>
      i.id === contentPanArtboardId.current
        ? { ...i, contentOffset: {
            x: clamp(rawX, maxPanX, 0),
            y: clamp(rawY, maxPanY, 0),
          }}
        : i
    ));
  }
  return;
}
```

#### handlePointerUp — 컨텐츠 패닝 종료
```ts
if (isContentPanning.current) {
  isContentPanning.current = false;
  contentPanArtboardId.current = null;
  if (canvasElRef.current) {
    canvasElRef.current.style.cursor = 'grab';
  }
  return;
}
```

### N33-5: 드로잉 좌표 보정 (pen/eraser + contentOffset/Scale 반영)
**파일**: `sketch-to-image/src/app/page.tsx`

`getArtboardLocal` 은 artboard 로컬 좌표(0..width)를 반환하지만, contentOffset+contentScale이 적용된 뷰에서 드로잉 시 시각적 위치와 불일치 발생.

보정 공식:
```
drawX = (artboardLocalX - contentOffset.x) / (contentScale / 100)
drawY = (artboardLocalY - contentOffset.y) / (contentScale / 100)
```

`handlePointerDown` 및 `handlePointerMove`의 pen/eraser 드로잉 구간에서 artboard의 contentOffset, contentScale을 적용하여 좌표 변환.

```ts
// getArtboardLocal 결과 → draw 좌표 변환 helper
function getDrawCoords(pt: Point, artboard: CanvasItem): Point {
  const s = (artboard.contentScale ?? 100) / 100;
  const ox = artboard.contentOffset?.x ?? 0;
  const oy = artboard.contentOffset?.y ?? 0;
  return {
    x: (pt.x - ox) / s,
    y: (pt.y - oy) / s,
  };
}
```

pen/eraser의 `lastDrawPoint`, `pt` 세팅 위치에서 `getDrawCoords(getArtboardLocal(...), artboard)` 사용.

### N33-6: GENERATE — 전체 컨텐츠 전송 보장
**파일**: `sketch-to-image/src/app/page.tsx` — `handleGenerate`

**목적**: contentOffset/contentScale에 의해 화면에 일부만 보이더라도, GENERATE 시에는 artboard 전체 데이터(배경 이미지 + 스케치 스트로크 전체)가 전송되어야 함.

**현재 export 구조 검증**:
```
exportCanvas (item.width × item.height)
  ├── fillRect 흰 배경
  ├── drawImage(bg, 0, 0, item.width, item.height)  ← 배경 이미지 전체
  └── drawImage(sketchCanvas, 0, 0)                 ← 스케치 전체 픽셀
```

- **배경 이미지**: `drawImage(bg, 0, 0, item.width, item.height)` — contentOffset 무관, 항상 artboard 전체 면적에 렌더링 ✓
- **스케치 canvas**: N33-5의 `getDrawCoords` 보정으로 모든 스트로크가 artboard 100% 좌표계에 저장 → `drawImage(sketchCanvas, 0, 0)` 로 전체 캡처 ✓
- **contentOffset/contentScale**: CSS transform (시각 전용) → export 로직에 적용하지 않음 ✓

**결론**: export 구조 변경 불필요. 단, 의도를 명시하는 주석 추가:
```ts
// GENERATE: contentOffset/contentScale은 시각 전용 —
// 배경+스케치 모두 artboard 전체(100% 좌표계)로 캡처하여 전송
ctx.drawImage(sketchCanvas, 0, 0);
```

---

## 파일 변경 목록

| 파일 | 변경 항목 |
|------|-----------|
| `src/types/canvas.ts` | `contentOffset` 필드 추가 |
| `src/app/page.tsx` | grid backgroundPosition, content div transform, refs, pointerDown/Move/Up 로직, getDrawCoords helper, handleGenerate 주석 |

---

## 작업 순서
1. N33-1: grid backgroundPosition → center center
2. N33-2: canvas.ts contentOffset 타입 추가
3. N33-3: content div transform 수정
4. N33-4: isContentPanning refs + pointerDown/Move/Up 로직
5. N33-5: getDrawCoords helper + pen/eraser 좌표 보정
6. N33-6: handleGenerate 주석 추가
