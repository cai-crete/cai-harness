---
id: N20
title: Hydration Mismatch + 지우개 "전체 삭제" 버그 수정
date: 2026-04-18
status: active
---

# N20: Hydration Mismatch + 지우개 "전체 삭제" 버그 수정

## 문제 1: SSR Hydration Mismatch
- `useState(lsLoadItems)` 등이 서버에서는 빈 값, 클라이언트에서는 localStorage 값을 반환
- React 서버 HTML ≠ 클라이언트 Hydration → 전체 재렌더 + 개발 모드 오버레이 에러

## 문제 2: 지우개로 모든 스케치가 지워지는 버그 (Critical)
**근본 원인:**
1. 인라인 ref 콜백은 매 렌더마다 `null → element` 두 번 호출됨 (React 스펙)
2. `null` 호출 → `pixelRestoredRef.current.delete(item.id)` → guard 리셋
3. `element` 호출 → `has(item.id) === false` → IndexedDB 재로드 시작 (매 렌더마다)
4. IndexedDB `drawImage` 실행 시 context의 `globalCompositeOperation`이 `destination-out`으로 남아있어 전체 픽셀 삭제

**방침:** 초기 지우개(`destination-out`) 방식은 유지. guard 버그와 context 오염만 수정.

## 수정 내용 (page.tsx)

### Fix 1: Hydration
- `canvasZoom` 초기값: `100` (SSR-safe)
- `canvasOffset` 초기값: `{ x: 0, y: 0 }` (SSR-safe)
- `canvasItems` 초기값: `[]` (SSR-safe)
- 기존 두 개의 mount `useEffect([], [])` (ref 동기화, IndexedDB 복원)를 하나로 통합

### Fix 2: 지우개 guard 버그
- canvas ref callback `else` 분기: `pixelRestoredRef.current.delete(item.id)` 제거
  - `artboardCanvasRefs.current.delete(item.id)` 는 유지
  - `pixelRestoredRef`는 `handleDeleteItem`에서만 삭제 (진짜 아이템 삭제 시)
- 복원 코드(loadImageFromDB then): `ctx.globalCompositeOperation = 'source-over'` 명시적으로 설정 후 drawImage
  - destination-out이 context에 남아있어도 복원이 지우기로 작동하는 현상 방지
