# exec-plan-N29 — 이미지 업로드 크롭 방지 + 다중 선택 드래그

**노드**: sketch-to-image  
**날짜**: 2026-04-19  
**상태**: active

---

## 요구사항 요약

| # | 요구사항 |
|---|----------|
| N29-A | 아트보드 이미지 업로드 시 이미지 크롭 방지 → 아트보드 내에 전체 이미지 표시 |
| N29-B | select 모드 빈 캔버스 드래그 → 점선 직사각형 다중 선택 |

---

## N29-A: 이미지 크롭 방지

### 문제

- `artboard` / `upload` 타입 아이템의 `src` 이미지가 `object-cover`로 렌더링
- → 아트보드 비율과 다른 이미지가 잘려 보임

### 해결 방향

- `artboard` / `upload` 타입 이미지 렌더링을 `object-contain`으로 변경
- 아트보드 크기는 그대로 유지, 이미지 전체가 아트보드 내에 들어오도록 표시
- 다른 타입(`sketch_generated`, `generated`, 등)은 기존 `object-cover` 유지

### 변경 대상

| 파일 | 위치 | 변경 내용 |
|------|------|---------|
| `sketch-to-image/src/app/page.tsx` | L1048 (img 태그) | `artboard`/`upload` → `object-contain`, 그 외 → `object-cover` |

### 변경 전/후

```tsx
// BEFORE
<img src={item.src} alt="" className="w-full h-full object-cover" draggable={false} />

// AFTER
<img
  src={item.src}
  alt=""
  className={`w-full h-full ${(item.type === 'artboard' || item.type === 'upload') ? 'object-contain' : 'object-cover'}`}
  draggable={false}
/>
```

---

## N29-B: Select 모드 다중 선택 드래그 (Rubber Band Selection)

### 현재 동작

select 모드에서 빈 캔버스 클릭/드래그 → itemId 없으면 아무 동작 없음

```ts
// page.tsx select 분기
if (canvasMode === 'select') {
  if (itemId) { ... }  // itemId 없으면 그냥 return
  return;
}
```

### 목표 동작

select 모드 + 빈 캔버스(아이템 없는 영역) 드래그 시:
1. 드래그 시작 → 점선 직사각형 오버레이 표시
2. 드래그 완료 → 범위 내 아이템 전체 선택 (경계 교차 포함)
3. 빈 공간 단순 클릭(드래그 없음) → 선택 해제

### 구현 설계

#### 추가 state / ref

```ts
// 드래그 선택 rect (캔버스 좌표계)
const [dragSelectRect, setDragSelectRect] = useState<{
  startX: number; startY: number; endX: number; endY: number;
} | null>(null);
const dragSelectStartRef = useRef<{ ptX: number; ptY: number } | null>(null);
const isDragSelectingRef = useRef(false);
```

#### handlePointerDown — select 모드 빈 캔버스

```ts
if (!itemId) {
  setSelectedItemIds([]);
  const pt = getCanvasCoords(e.clientX, e.clientY);
  dragSelectStartRef.current = { ptX: pt.x, ptY: pt.y };
  isDragSelectingRef.current = false;
  canvasElRef.current?.setPointerCapture(e.pointerId);
}
```

#### handlePointerMove — rect 업데이트

```ts
if (dragSelectStartRef.current) {
  const pt = getCanvasCoords(e.clientX, e.clientY);
  isDragSelectingRef.current = true;
  setDragSelectRect({
    startX: dragSelectStartRef.current.ptX,
    startY: dragSelectStartRef.current.ptY,
    endX: pt.x,
    endY: pt.y,
  });
  return;
}
```

#### handlePointerUp — 선택 확정 + cleanup

```ts
if (dragSelectStartRef.current) {
  if (isDragSelectingRef.current && dragSelectRect) {
    const minX = Math.min(dragSelectRect.startX, dragSelectRect.endX);
    const maxX = Math.max(dragSelectRect.startX, dragSelectRect.endX);
    const minY = Math.min(dragSelectRect.startY, dragSelectRect.endY);
    const maxY = Math.max(dragSelectRect.startY, dragSelectRect.endY);
    const selected = canvasItemsRef.current
      .filter(item =>
        item.x < maxX && item.x + item.width > minX &&
        item.y < maxY && item.y + item.height > minY
      )
      .map(i => i.id);
    setSelectedItemIds(selected);
  }
  dragSelectStartRef.current = null;
  isDragSelectingRef.current = false;
  setDragSelectRect(null);
  return;
}
```

#### JSX — 점선 오버레이 (캔버스 transform 컨테이너 내)

```tsx
{dragSelectRect && (() => {
  const left = Math.min(dragSelectRect.startX, dragSelectRect.endX);
  const top = Math.min(dragSelectRect.startY, dragSelectRect.endY);
  const width = Math.abs(dragSelectRect.endX - dragSelectRect.startX);
  const height = Math.abs(dragSelectRect.endY - dragSelectRect.startY);
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left, top, width, height,
        border: '1.5px dashed #4f9cf9',
        background: 'rgba(79,156,249,0.08)',
        zIndex: 99999,
      }}
    />
  );
})()}
```

### 변경 대상 파일·위치

| 파일 | 위치 | 변경 내용 |
|------|------|---------|
| `src/app/page.tsx` | state 영역 (~L118) | `dragSelectRect` state + `dragSelectStartRef`, `isDragSelectingRef` 추가 |
| `src/app/page.tsx` | select 분기 (`handlePointerDown`) | 빈 캔버스 → 드래그 선택 시작 |
| `src/app/page.tsx` | `handlePointerMove` | 드래그 rect 업데이트 분기 추가 |
| `src/app/page.tsx` | `handlePointerUp` | 선택 확정 + cleanup 분기 추가 |
| `src/app/page.tsx` | 캔버스 JSX (transform 컨테이너 내) | 점선 rect 오버레이 렌더링 |

---

## 작업 순서

1. [ ] N29-A: img 태그 → `object-contain` 조건 분기
2. [ ] N29-B: state/ref 3개 추가
3. [ ] N29-B: `handlePointerDown` 빈 캔버스 드래그 선택 시작
4. [ ] N29-B: `handlePointerMove` rect 업데이트
5. [ ] N29-B: `handlePointerUp` 선택 확정 + cleanup
6. [ ] N29-B: JSX 점선 오버레이 렌더링
7. [ ] N28 exec-plan active → completed 이동
8. [ ] claude-progress.txt 업데이트

---

## 영향 범위

- N29-A: img 태그 className 조건 1개만 변경. `handleArtboardImageUpload` 무변경.
- N29-B: select 모드 + 빈 캔버스 한정. 기존 이동/리사이즈/펜/지우개 동작 무변경.
- 다중 선택 후 이동은 이번 스코프 외 (현재 컨트롤 바는 첫 번째 item만 처리).
