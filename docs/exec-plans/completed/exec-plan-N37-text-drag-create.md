---
plan_id: N37
title: 텍스트 모드 드래그로 박스 생성
date: 2026-04-22
status: active
---

## 목표
1. text 모드에서 드래그하여 텍스트 박스 크기 지정 후 생성
2. 드래그 미리보기: 실선 박스, fill=none
3. text 모드에서 기존 텍스트 박스 클릭 시 원본 크기 그대로 in-place 수정

## 현재 drag-select 코드 (참조)
- state: `dragSelectRect` (`startX/Y, endX/Y`)
- refs: `dragSelectStartRef`, `isDragSelectingRef`
- overlay: dashed `#4f9cf9`, `rgba(79,156,249,0.08)` fill
- pointerDown: 빈 캔버스 클릭 시 시작
- pointerMove: rect 업데이트
- pointerUp: 아이템 선택 후 rect 클리어

## 구현 계획

### 1. textInput 타입 확장
- `initWidth?: number`, `initHeight?: number` 추가
- 기존 아이템 편집 시: 아이템 width/height 전달
- 드래그 생성 시: 드래그 크기 전달

### 2. textDragRect state/refs 추가
```typescript
const [textDragRect, setTextDragRect] = useState<{startX:number;startY:number;endX:number;endY:number}|null>(null);
const textDragStartRef = useRef<{ptX:number;ptY:number}|null>(null);
const isTextDraggingRef = useRef(false);
```

### 3. handlePointerDown text 모드 변경
- 기존 텍스트 hit → `setTextInput({ ..., initWidth: item.width, initHeight: item.height })`
- 빈 캔버스 → drag 시작 (setPointerCapture, textDragStartRef 설정)

### 4. handlePointerMove text drag 추가
```typescript
if (textDragStartRef.current) {
  isTextDraggingRef.current = true;
  setTextDragRect({ startX, startY, endX: pt.x, endY: pt.y });
  return;
}
```

### 5. handlePointerUp text drag 확정
- drag 있었으면 → `setTextInput({ x: minX, y: minY, value: '', initWidth: max(w,120), initHeight: max(h,32) })`
- click만이면 → `setTextInput({ x, y, value: '' })` (기본 크기)
- `textDragRect`, refs 클리어

### 6. textDragRect 오버레이
- 실선 `1.5px solid #4f9cf9`, background: none
- canvasTransformStyle 내부, z-[103]

### 7. textarea 스타일
- `width: textInput.initWidth`, `height: textInput.initHeight` (설정된 경우만)
- minWidth/minHeight 유지

## 수정 파일
- `sketch-to-image/src/app/page.tsx`
