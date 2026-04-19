---
id: N14
title: 커서 모드 고정 + 선택 아이템 기반 이미지 생성
status: in-progress
date: 2026-04-17
---

## 목적

1. 커서(select) 버튼 활성 시 캔버스 커서가 항상 기본 화살표(default)로 유지
2. 팬(pan) 버튼 활성 시 캔버스 커서가 항상 손 모양(grab)으로 유지
3. GENERATE는 반드시 아이템 선택 후에만 동작 (아트보드 or sketch_generated)
   - 선택 없으면 경고 후 전송 차단, fallback 없음
4. 아이템 타입별 이미지 데이터 처리:
   - artboard: 업로드 배경 이미지 + 스케치 드로잉 합성 → 전송
   - sketch_generated: src 이미지 그대로 → 전송

## 원인 분석

### Fix 1 — 커서 모양 문제
- 캔버스 래퍼: pan 모드에서 `isDraggingPan.current ? 'grabbing' : 'grab'`
  - ref 변경은 리렌더링 없음 → 커서 업데이트 안 됨
- 아이템 div: `cursor: canvasMode === 'select' ? 'move' : 'default'`
  - select 모드에서 아이템 위 커서가 'move'로 변경됨

### Fix 2 — 이미지 생성 로직 문제
- `handleGenerate`에서 첫 번째 artboard를 자동 선택 (선택 상태 무시)
- artboard의 업로드 이미지(`item.src`)가 내보내기에 포함되지 않음

## 수정 파일

- `sketch-to-image/src/app/page.tsx`

## 변경 내용

### 1. 캔버스 래퍼 커서
- pan → 항상 `'grab'` (dragging 여부 무관)
- 그 외 → 기존 유지

### 2. 아이템 div 커서
- 항상 `'default'` (select 모드에서도 'move' 제거)

### 3. handleGenerate — 선택 아이템 기반 처리
```
const selectedId = selectedItemIdsRef.current[0];
const item = selectedId ? canvasItemsRef.current.find(i => i.id === selectedId) : null;

if (!item || (item.type !== 'artboard' && item.type !== 'sketch_generated')) {
  setGenerateWarning('아트보드 또는 이미지를 선택하세요');
  setTimeout(() => setGenerateWarning(null), 1500);
  return;
}
```

### 4. handleGenerate — 타입별 이미지 합성
```
artboard:
  exportCanvas = white bg + item.src(업로드이미지) + sketchCanvas(드로잉)

sketch_generated:
  sketchBase64 = item.src에서 base64 추출 (그대로 전송)
```
