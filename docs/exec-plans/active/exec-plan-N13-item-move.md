---
id: N13
title: 캔버스 아이템 이동 구현
status: completed
date: 2026-04-17
---

## 문제
select 모드에서 아이템(artboard / sketch_generated)을 드래그해도 이동되지 않음.
브라우저 기본 이미지 드래그가 포인터 이벤트를 가로챔.

## 근본 원인

### 원인 1: 이동 로직 자체가 없었음
`handlePointerDown`에 `canvasMode === 'select'` 분기가 없었음.
resize-handle, pan, pen/eraser 만 처리하고 select 아이템 드래그는 미구현.

### 원인 2: `<img>` 브라우저 기본 드래그
`<img draggable>` 기본값 true → 드래그 시작 시 브라우저가 이미지 ghost 드래그로 처리.
PointerCapture가 설정되기 전에 브라우저가 drag 이벤트를 가로챔.

## 수정 내용 (page.tsx)

### 1. 새 refs 추가 (~line 145)
```tsx
const isMovingItem = useRef(false);
const moveItemId = useRef<string | null>(null);
const moveStart = useRef({ ptX: 0, ptY: 0, itemX: 0, itemY: 0 });
```

### 2. item div에 data-item-id 추가
DOM 순회로 클릭된 아이템 식별.

### 3. img에 draggable={false}
브라우저 기본 이미지 드래그 차단.

### 4. item div cursor 수정
`cursor: canvasMode === 'select' ? 'move' : 'default'`

### 5. handlePointerDown — select 모드 이동 시작
```tsx
if (canvasMode === 'select') {
  // DOM 순회로 data-item-id 탐색
  // 찾으면: e.preventDefault(), setPointerCapture, moveStart 기록
  return;
}
```

### 6. handlePointerMove — 이동 드래그 처리
```tsx
if (isMovingItem.current && moveItemId.current) {
  // pt - moveStart.ptX/ptY → item.x/y 업데이트
  return;
}
```

### 7. handlePointerUp — isMovingItem 클리어
```tsx
if (isMovingItem.current) {
  isMovingItem.current = false;
  moveItemId.current = null;
  return;
}
```
