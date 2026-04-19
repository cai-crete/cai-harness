# exec-plan-N21: 새로고침 후 캔버스 상태 유지 — 감사 및 보완

## 목표
웹 새로고침(F5) 시 캔버스의 아트보드, 업로드 이미지, 생성 이미지, 픽셀 스케치가 완전히 복원된다.

---

## 현재 구현 현황 (N16~N20 완료 상태)

| 데이터 | 저장 방식 | 저장 시점 | 복원 방식 |
|---|---|---|---|
| 아이템 구조 (위치/크기/타입 등) | localStorage (`cai-canvas-items`) | `canvasItems` state 변경 시 | 마운트 effect → `lsLoadItems()` |
| 뷰 (zoom/offset) | localStorage (`cai-canvas-view`) | zoom/offset 변경 시 | 마운트 effect → `lsLoadView()` |
| 배경 이미지 src (base64) | IndexedDB (`CanvasImageStore`, key: `item.id`) | `canvasItems` 변경 시 src가 `data:` 시작이면 | 마운트 effect 비동기 루프 → `loadImageFromDB(item.id)` |
| 픽셀 스케치 (canvas overlay) | IndexedDB (key: `pixel_${item.id}`) | `pointerup` 스트로크 완료 시 | canvas ref 콜백 → `loadImageFromDB('pixel_${id}')`, 1회 guard (`pixelRestoredRef`) |

---

## 현재 정상 동작하는 시나리오

1. ✅ 아트보드 생성 → 새로고침 → 아트보드 위치/크기 복원
2. ✅ 아트보드에 펜으로 그림 → 새로고침 → 픽셀 스케치 복원
3. ✅ 이미지 업로드 → 새로고침 → 배경 이미지 복원
4. ✅ AI 생성 이미지 캔버스 배치 → 새로고침 → 이미지 복원
5. ✅ zoom/offset → 새로고침 → 뷰 복원

---

## 확인된 갭 (Gap)

### Gap 1: Undo/Redo 후 픽셀 상태가 IndexedDB에 반영되지 않음
- **현상**: Ctrl+Z(Undo) 또는 Ctrl+Y(Redo) 후 새로고침 시 undo 이전 상태가 표시됨
- **원인**: `handleUndo`/`handleRedo` 는 `ImageData`를 canvas에 복원하지만 `saveImageToDB` 호출 없음
- **위치**: `page.tsx:789` `handleUndo`, `page.tsx:808` `handleRedo`
- **수정**: undo/redo 실행 후 `saveImageToDB('pixel_${id}', canvas.toDataURL())` 추가

### Gap 2: 아트보드 리사이즈 시 픽셀 데이터 소실
- **현상**: 아트보드 크기 조절 후 픽셀 스케치가 사라짐 (새로고침 무관, resize 즉시 발생)
- **원인**: canvas ref 콜백에서 `el.width !== Math.round(item.width)` 이면 canvas width 재설정 → canvas 내용 초기화
  - `pixelRestoredRef.has(id)` 가 true이므로 IndexedDB 재로드 안 함 → 픽셀 데이터 영구 손실
- **위치**: `page.tsx:956~977` canvas ref 콜백
- **수정 방안**:
  a. 리사이즈 전 현재 ImageData를 임시 저장해두었다가, 새 canvas 크기에 맞게 drawImage로 복원
  b. 또는 리사이즈 완료 시(`pointerup`) `saveImageToDB` 로 현재 상태 저장 + `pixelRestoredRef.delete(id)` 로 guard 초기화 → 다음 ref 콜백에서 IndexedDB 재로드

  **권장**: 방안 b (구현 단순, 리사이즈 완료 시점이 명확)

### Gap 3: 아트보드 리사이즈 후 새로고침 시 canvas 크기 불일치
- **현상**: 새로고침 후 아트보드 크기는 복원되지만, canvas에 그려진 픽셀 데이터가 `drawImage` 호출 시 리사이즈 전 크기로 저장된 이미지를 새 크기에 맞게 늘려서 그림 → 왜곡 발생
- **원인**: `ctx.drawImage(img, 0, 0)` 는 이미지 원본 크기 그대로 그림. canvas 크기가 바뀌었으면 `ctx.drawImage(img, 0, 0, el.width, el.height)` 로 스케일링 필요
- **수정**: canvas ref 콜백의 `ctx.drawImage(img, 0, 0)` → `ctx.drawImage(img, 0, 0, el.width, el.height)`

---

## 구현 계획

### Task 1 — Gap 1 수정: Undo/Redo 후 IndexedDB 업데이트
```
handleUndo 내부:
  픽셀 캔버스 복원 후 → saveImageToDB('pixel_${entry.id}', canvas.toDataURL('image/png'))

handleRedo 내부:
  픽셀 캔버스 복원 후 → saveImageToDB('pixel_${entry.id}', canvas.toDataURL('image/png'))
```

### Task 2 — Gap 2 수정: 리사이즈 완료 시 픽셀 데이터 재저장
```
handlePointerUp 내부 isResizingItem 분기:
  isResizingItem.current = false;
  // 선택된 아이템의 픽셀 캔버스 재저장 + guard 초기화
  const resizedId = selectedItemIdsRef.current[0];
  if (resizedId) {
    const canvas = artboardCanvasRefs.current.get(resizedId);
    if (canvas) saveImageToDB('pixel_${resizedId}', canvas.toDataURL('image/png'));
    pixelRestoredRef.current.delete(resizedId);  // 다음 렌더에서 canvas 재설정 후 IndexedDB 재로드
  }
  return;
```

> 단, canvas ref 콜백에서 `el.width` 재설정이 canvas 내용을 지우므로, IndexedDB 재로드 후 올바른 크기로 복원됨

### Task 3 — Gap 3 수정: drawImage 스케일링
```
canvas ref 콜백 loadImageFromDB.then 내부:
  ctx.drawImage(img, 0, 0, el.width, el.height);  // 0, 0 → 0, 0, el.width, el.height
```

---

## 검증 시나리오

1. **기본 새로고침 복원**
   - 아트보드 생성 → 스케치 → 새로고침 → 픽셀 동일?
   - 이미지 업로드 → 새로고침 → 이미지 동일?
   - AI 생성 이미지 배치 → 새로고침 → 이미지 동일?

2. **Undo 후 새로고침**
   - 스케치 → Ctrl+Z → 새로고침 → undo 상태가 표시되는가?

3. **리사이즈 후 새로고침**
   - 스케치 → 리사이즈 → 새로고침 → 픽셀 데이터 유지되는가? (왜곡 없는가?)

4. **여러 아이템 복합**
   - 아트보드 2개 + 업로드 이미지 1개 → 각각 그림 → 새로고침 → 모두 복원?

---

## 수정 범위
- `sketch-to-image/src/app/page.tsx`
  - `handleUndo` (~line 789)
  - `handleRedo` (~line 808)
  - `handlePointerUp` (~line 671)
  - canvas ref 콜백 (~line 963)

---

## 작업지시서 메타
- **담당**: Claude
- **우선순위**: 높음 (사용자 데이터 손실 방지)
- **예상 작업량**: 소 (4개 지점 수정)
- **의존성**: N16~N20 완료 상태 전제
