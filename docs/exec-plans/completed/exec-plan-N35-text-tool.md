---
id: N35
title: 텍스트 툴 — 캔버스 클릭 시 직사각형 textarea 입력/배치
status: active
created: 2026-04-22
---

## 목표
text mode에서 캔버스 클릭 → 클릭 위치에 직사각형 textarea 오버레이 등장
Enter 확정 / Esc 취소 → type:'text' CanvasItem 생성

## UI 스펙
- 위치: canvasTransformStyle 내 absolute (canvas 좌표계)
- 스타일: border 1px solid rgba(0,0,0,0.3), bg rgba(255,255,255,0.95), backdrop-blur-sm, rounded 없음
- 폰트: font-sans 14px, px-3 py-2
- resize: both
- focus: outline-none
- shadow: 0 4px 16px rgba(0,0,0,0.12)
- min-width: 120px, min-height: 32px

## 입력 확정/취소
- Enter (shift+Enter 제외) → 확정
- Esc → 취소
- 빈 텍스트 → 취소와 동일

## 구현 범위 (page.tsx)

### N35-1: 상태 추가
- textInput state + textInputRef + textareaRef

### N35-2: handlePointerDown text 분기
- text mode + non-textarea 클릭 → 기존 textInput 있으면 커밋 후 새 좌표로 생성
- textarea 클릭 → 통과

### N35-3: textarea 오버레이 렌더
- canvasTransformStyle 내 z-[120] absolute textarea

### N35-4: text item 렌더 개선
- 기존 `<div className="p-1 text-sm">` → style 일치하는 pre-wrap div로 교체

### N35-5: cursor 스타일
- text mode → cursor: 'text'

## 작업 단계
1. [ ] N35-1~2: 상태 + 핸들러
2. [ ] N35-3~5: 렌더 + cursor
3. [ ] exec-plan completed/ / progress 갱신
