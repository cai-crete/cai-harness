# exec-plan-N22: persist effect 실행 순서 버그 수정

## 근본 원인

React useEffect는 선언 순서대로 실행된다.

```
[첫 렌더] canvasItems=[], canvasZoom=100 (SSR-safe 기본값)
  ↓ 렌더 완료 → effects 선언 순서 실행
  
Effect 1 (line 100):  lsSaveView(100, {0,0})   ← 저장된 뷰 덮어씀 ❌
Effect 2 (line 120):  lsSaveItems([])           ← 저장된 아이템 전부 삭제 ❌
Effect 3 (line 128):  lsLoadItems()             ← 이미 []인 localStorage 읽음 → 빈 배열 반환
```

**결과**: 매 새로고침마다 localStorage가 초기화됨. 아이템이 전혀 복원되지 않음.

## 수정 방안

`isRestoredRef` (useRef) 플래그로 persist effect를 마운트 복원 완료 후에만 실행하도록 게이팅.

```
isRestoredRef = useRef(false)

Effect 1 (view persist):  if (!isRestoredRef.current) return;  ← 초기 렌더 시 skip
Effect 2 (items persist): if (!isRestoredRef.current) return;  ← 초기 렌더 시 skip
Effect 3 (mount):
  setCanvasZoom/setCanvasOffset/setCanvasItems (복원값으로)
  isRestoredRef.current = true   ← 동기적으로 즉시 설정
  async () => { IndexedDB src 복원 }
```

**왜 동작하는가:**
- `setCanvasItems(items)`는 리렌더를 예약(비동기)
- `isRestoredRef.current = true`는 동기 실행 → 리렌더 전에 이미 true
- 리렌더 시 persist effect 재실행 → `isRestoredRef.current === true` → 복원된 데이터 정상 저장

## 수정 범위

`sketch-to-image/src/app/page.tsx`:

### 추가 (line 92 이후)
```typescript
const isRestoredRef = useRef(false);
```

### 수정 1 — view persist effect (line 100)
```typescript
// Before
useEffect(() => { lsSaveView(canvasZoom, canvasOffset); }, [canvasZoom, canvasOffset]);

// After
useEffect(() => {
  if (!isRestoredRef.current) return;
  lsSaveView(canvasZoom, canvasOffset);
}, [canvasZoom, canvasOffset]);
```

### 수정 2 — items persist effect (line 120)
```typescript
// Before
useEffect(() => {
  canvasItems.forEach(item => {
    if (item.src?.startsWith('data:')) saveImageToDB(item.id, item.src);
  });
  lsSaveItems(canvasItems);
}, [canvasItems]);

// After
useEffect(() => {
  if (!isRestoredRef.current) return;
  canvasItems.forEach(item => {
    if (item.src?.startsWith('data:')) saveImageToDB(item.id, item.src);
  });
  lsSaveItems(canvasItems);
}, [canvasItems]);
```

### 수정 3 — mount effect (line 128): isRestoredRef 설정 추가
```typescript
useEffect(() => {
  const view = lsLoadView();
  setCanvasZoom(view.zoom);
  setCanvasOffset(view.offset);
  canvasZoomRef.current = view.zoom;
  canvasOffsetRef.current = view.offset;

  const items = lsLoadItems();
  setCanvasItems(items);
  isRestoredRef.current = true;   // ← 여기 추가 (setState 이후, async 이전)

  (async () => { ... })();
}, []);
```

## 검증 시나리오
1. 아트보드 생성 → 새로고침 → 아트보드 유지
2. 이미지 업로드 → 새로고침 → 이미지 유지
3. zoom/offset 변경 → 새로고침 → 뷰 유지
4. 스케치 후 → 새로고침 → 픽셀 유지

## 메타
- 수정 지점: 3곳 (page.tsx)
- 예상 작업량: 소
- 영향 범위: 모든 persistence 기능
