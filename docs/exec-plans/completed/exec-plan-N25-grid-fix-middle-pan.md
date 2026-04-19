# Exec Plan N25: Grid 렌더링 수정 + 중간 마우스 버튼 패닝

## 목표
1. 태블릿/모바일에서 grid가 겹쳐 보이는 현상 수정
2. 웹에서 마우스 휠 클릭(중간 버튼) 시 패닝 기능 추가

## 진단

### Grid 겹침 원인
- **서브픽셀**: 터치 이벤트 offset이 소수점 → Retina DPR 2x에서 1px 라인이 안티앨리어싱되어 이중 선처럼 보임
- **opacity 유사**: Minor 0.08 vs Major 0.14 — 두 그리드가 동급 두께로 보여 "겹쳐 보이는" 인상

### 중간 마우스 버튼
- `handlePointerDown`에서 `e.button` 분기 없음 → button=1 (휠클릭) 무처리

## 수정 방식

### 파일 1: InfiniteGrid.tsx
- `Math.round(offset.x/y)` — 정수 픽셀 snap (서브픽셀 방지)
- Minor opacity 낮춤: `0.08 → 0.04` (light), `0.08 → 0.06` (dark)
- Minor grid 최소 셀 크기 미만 시 숨김: `minor < 6px`

### 파일 2: page.tsx
- `isMiddleButtonPanning` ref 추가
- `canvasModeRef` 추가 (cursor 복구용)
- `handlePointerDown`: `e.button === 1` → 중간버튼 패닝 시작
- `handlePointerMove`: `isMiddleButtonPanning.current` → offset 업데이트
- `handlePointerUp`: `isMiddleButtonPanning.current` → 패닝 종료, cursor 복구

## 상태
- [ ] InfiniteGrid.tsx 수정
- [ ] page.tsx 수정
- [ ] 완료 처리
