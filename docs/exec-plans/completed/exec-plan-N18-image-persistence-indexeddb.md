# exec-plan N18 — 이미지 영속성: IndexedDB 이중 저장 구조

**날짜:** 2026-04-18  
**상태:** active  
**참조:** image-persistence.md (사용자 업로드)

---

## 문제

현재 `canvasItems.src` (Base64 이미지) + 픽셀 캔버스 드로잉이 모두 **localStorage**에 저장됨.  
새로고침 후 `QuotaExceededError` 발생 → 이미지 소실.

---

## 해결 구조 (2-Layer)

| 저장소 | 내용 |
|--------|------|
| `localStorage` | 구조 데이터 (위치·크기 등) — src는 `''`으로 strip |
| `IndexedDB` (localforage) | Base64 이미지 — `{id}` → src, `pixel_{id}` → 캔버스 드로잉 |

---

## 변경 파일

| 파일 | 작업 |
|------|------|
| `package.json` | `localforage` 추가 (`npm install localforage`) |
| `src/lib/imageDB.ts` | **신규** — IndexedDB CRUD wrapper |
| `src/app/page.tsx` | localStorage strip + IndexedDB 저장/복원 |

---

## page.tsx 상세 변경

### A. lsSaveItems — src strip
```ts
function lsSaveItems(items: CanvasItem[]) {
  const stripped = items.map(i => ({ ...i, src: i.src?.startsWith('data:') ? '' : i.src }));
  try { localStorage.setItem(LS_ITEMS, JSON.stringify(stripped)); } catch { }
}
```

### B. canvasItems useEffect — src → IndexedDB 저장
```ts
useEffect(() => {
  canvasItems.forEach(item => {
    if (item.src?.startsWith('data:')) saveImageToDB(item.id, item.src);
  });
  lsSaveItems(canvasItems);
}, [canvasItems]);
```

### C. 마운트 후 IndexedDB → src 복원 (async rehydration)
```ts
useEffect(() => {
  (async () => {
    const updates: { id: string; src: string }[] = [];
    for (const item of canvasItemsRef.current) {
      if (!item.src) {
        const data = await loadImageFromDB(item.id);
        if (data) updates.push({ id: item.id, src: data });
      }
    }
    if (updates.length > 0) {
      setCanvasItems(prev =>
        prev.map(i => {
          const u = updates.find(u => u.id === i.id);
          return u ? { ...i, src: u.src } : i;
        })
      );
    }
  })();
}, []); // eslint-disable-line
```

### D. 픽셀 캔버스 — localStorage → IndexedDB
- `lsSavePixel` / `lsLoadPixels` / `lsDeletePixel` 제거
- `handlePointerUp`: `saveImageToDB('pixel_' + id, dataUrl)`
- `handleDeleteItem`: `deleteImageFromDB('pixel_' + id)`
- canvas ref 콜백: `pendingPixelRestoreRef` 패턴 제거 → async `loadImageFromDB('pixel_' + id)`

---

## 작업 순서

1. `npm install localforage` (sketch-to-image/)
2. `src/lib/imageDB.ts` 생성
3. `page.tsx` 수정
4. 빌드 확인
5. exec-plan → completed, progress 저장
