---
id: N23
title: 태블릿 터치/스타일러스 환경 수정
date: 2026-04-19
status: active
---

# N23: 태블릿 터치/스타일러스 환경 수정

## 목표
태블릿에서 Apple Pencil 등 스타일러스 및 손가락 제스처가 올바르게 동작하도록 수정

## 문제 분석

### Issue 1: 스타일러스 획이 계속 이어짐
- **원인**: `pointercancel` 이벤트 핸들러 없음
- 브라우저가 터치를 인터셉트하면 `pointerup` 없이 포인터 캡처 해제
- `activeArtboardId.current`, `lastDrawPoint.current`가 초기화되지 않아 다음 pointermove에서 이전 획이 연결됨

### Issue 2: 핀치 줌이 브라우저 웹 줌으로 처리
- **원인**: React는 터치 이벤트를 기본적으로 passive 리스너로 등록
- `handleTouchMove`의 `e.preventDefault()`가 실제로 작동하지 않음
- 브라우저가 먼저 터치를 가로채 웹 확대/축소 처리

### Issue 3: 팬 모드에서 두 손가락 충돌
- 첫 손가락 pointerdown → 패닝 시작
- 두 번째 손가락 추가 → 패닝 활성화 상태로 핀치 시도 → 줌 + 패닝 동시 꼬임

## 수정 항목

### 1. `touch-action: none` 추가 (캔버스 div)
- 브라우저 터치 인터셉트 차단 → Issue 1, 2 동시 해결
- pointercancel 방지 + 브라우저 줌 비활성화

### 2. `onPointerCancel={handlePointerUp}` 추가
- pointercancel 시 안전망: 모든 드래그/드로우 상태 초기화

### 3. 펜/지우개 모드에서 touch 포인터 타입 스킵
- handlePointerDown: `pointerType === 'touch'`이면 드로잉 시작 안 함
- handlePointerMove: `pointerType === 'touch'`이면 드로잉 스킵
- 두 손가락 핀치 제스처와 충돌 방지

### 4. activeTouchCount ref 추가 (팬 모드 충돌 해결)
- 터치 포인터 수 추적
- 2개 이상이 되면 isDraggingPan 즉시 취소
- touchmove에서 핀치 줌만 처리

### 5. handleTouchMove에서 e.preventDefault() 제거
- touch-action:none으로 불필요
- passive 리스너 경고 방지

## 수정 파일
- `sketch-to-image/src/app/page.tsx`
