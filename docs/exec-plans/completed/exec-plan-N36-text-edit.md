---
plan_id: N36
title: 텍스트 박스 편집 기능
date: 2026-04-22
status: active
---

## 목표
1. select 모드에서 기존 텍스트 박스 더블클릭 → 텍스트 수정
2. text 모드에서 기존 텍스트 박스 클릭 → 텍스트 수정

## 구현 계획

### 1. `textInput` state 타입 확장
- `editingId?: string` 필드 추가
- 기존 항목 편집 시: `{ x, y, value: 기존텍스트, editingId: item.id }`
- 신규 생성 시: `{ x, y, value: '' }` (editingId 없음)

### 2. commit 로직 공통화
- `editingId` 있음 → 기존 아이템 text/width/height 업데이트
- `editingId` 없음 → 신규 CanvasItem 생성 (기존 동작)
- 적용 위치: textarea `onKeyDown(Enter)`, handlePointerDown text 모드

### 3. text 모드 handlePointerDown 수정
- 클릭 좌표로 기존 text 아이템 hit-test
- 히트 시: `setTextInput({ x, y, value: item.text, editingId: item.id })`
- 미히트 시: 기존대로 신규 생성

### 4. select 모드 item div에 `onDoubleClick` 추가
- `item.type === 'text'`인 경우만 처리
- `setTextInput({ x: item.x, y: item.y, value: item.text, editingId: item.id })`

### 5. select 모드에서 외부 클릭 시 커밋
- handlePointerDown select 블록 진입 시 `textInputRef.current` 체크
- TEXTAREA가 아닌 경우 commit 후 클리어

### 6. 편집 중인 텍스트 아이템 원본 숨기기
- item 렌더 시 `textInput?.editingId === item.id`이면 text div 숨김
- textarea overlay가 정확한 위치에 표시되므로 시각적 일관성 유지

## 수정 파일
- `sketch-to-image/src/app/page.tsx`
