# exec-plan-N26: 태블릿 펜슬/터치 입력 최적화

## 배경
iPad Safari에서 Apple Pencil로 캔버스 사용 시 3가지 문제 발생:
1. 펜슬 드래그 시 Safari 텍스트 선택 툴바("복사하기/선택 영역 찾기/번역") 발동
2. pen/eraser 모드에서 손가락/손바닥 터치 시 드로잉 입력으로 처리되는 위험
3. pen/eraser 모드에서 손가락 터치 시 아무 반응 없음 (패닝이 작동해야 함)

## 적용 범위
- 요청 2, 3: `pen`, `eraser` 모드에만 해당 (select 모드 기존 동작 유지)

---

## N26-A: Safari 텍스트 선택 툴바 방지

**원인:** `touchAction: 'none'`이 있지만 CSS `user-select`가 미적용 → 펜슬/손가락 드래그 시 브라우저가 텍스트/컨텐츠 선택으로 처리

**수정 위치:** `sketch-to-image/src/app/page.tsx`

**변경 사항:**
- 캔버스 컨테이너 div `style`에 추가:
  - `userSelect: 'none'`
  - `WebkitUserSelect: 'none'`
  - `WebkitTouchCallout: 'none'`

---

## N26-B: pen/eraser 모드에서 손가락 터치 → 패닝 전환

**현재 동작:** 손가락 터치 시 그냥 `return` (아무것도 안 함)
**목표 동작:** 
- 1손가락 터치 → 패닝 (isDraggingPan 활성화)
- 2손가락 터치 → 핀치 줌 (TouchEvent가 처리, isDraggingPan 비활성화)

**수정 위치:** `handlePointerDown`

**변경 사항:**
pen/eraser 모드 내 `if (e.pointerType === 'touch') return;` 를 아래로 교체:

```js
if (e.pointerType === 'touch') {
  activeTouchCount.current += 1;
  if (activeTouchCount.current === 1) {
    // 1손가락 → 패닝 시작
    isDraggingPan.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = { ...canvasOffsetRef.current };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (canvasElRef.current) canvasElRef.current.style.cursor = 'grabbing';
  } else {
    // 2손가락 → 핀치 우선, 패닝 취소
    isDraggingPan.current = false;
  }
  return;
}
```

---

## N26-C: handlePointerMove / handlePointerUp 수정

**handlePointerMove:**
- 기존: `if (canvasMode === 'pan' && isDraggingPan.current)` → pan 모드에서만 이동
- 수정: `if (isDraggingPan.current)` → 모드 무관하게 pan 처리

**handlePointerUp:**
- 기존: isDraggingPan 종료 시 cursor `'grab'`으로 고정
- 수정: `canvasModeRef` 기반으로 cursor 복구 (pen/eraser 모드면 `'none'`)

---

## 파일 변경 목록
- `sketch-to-image/src/app/page.tsx`
