# exec-plan N19 — 지우개 오류 수정: 픽셀 복원 1회 보장

**날짜:** 2026-04-18  
**상태:** active

---

## 버그

N18에서 `pendingPixelRestoreRef` (delete로 1회 보장) 제거 후 발생.  
지우개로 지운 내용이 다음 렌더에서 복원되는 현상.

## 원인

React 인라인 ref 콜백은 함수 identity가 바뀌므로 **매 렌더마다** `old_ref(null)` → `new_ref(el)` 호출됨.  
`handlePointerMove` → `setLastMousePos` → 렌더 → ref 콜백 → `loadImageFromDB` → resolve → `drawImage(이전 저장 데이터)` → 지우기 이전 상태로 복원.

## 수정

`pixelRestoredRef: useRef<Set<string>>` 추가 → 아이템당 1회만 IndexedDB 로드 보장.

### page.tsx 수정

```ts
// ref 선언 추가
const pixelRestoredRef = useRef<Set<string>>(new Set());

// canvas ref 콜백
if (el) {
  ...
  if (!pixelRestoredRef.current.has(item.id)) {
    pixelRestoredRef.current.add(item.id);
    loadImageFromDB(`pixel_${item.id}`).then(dataUrl => {
      if (dataUrl && el) {
        const img = new Image();
        img.onload = () => el.getContext('2d')?.drawImage(img, 0, 0);
        img.src = dataUrl;
      }
    });
  }
} else {
  artboardCanvasRefs.current.delete(item.id);
  pixelRestoredRef.current.delete(item.id); // 진짜 언마운트 시 재복원 허용
}

// handleDeleteItem에 추가
pixelRestoredRef.current.delete(id);
```
