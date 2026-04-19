---
id: N24
title: 태블릿/모바일 상태바 숨김
date: 2026-04-19
status: active
---

# N24: 태블릿/모바일 상태바 숨김

## 목표
태블릿·모바일(터치 기기)에서 하단 상태바를 숨겨 화면 공간 확보

## 탐지 방식
`@media (pointer: coarse)` — 주 입력장치가 터치인 기기 탐지 (화면 크기 무관)

## 수정 항목
1. `globals.css` — `@variant touch (@media (pointer: coarse));` 추가
2. `page.tsx` 상태바 div — `touch:hidden` 클래스 추가

## 수정 파일
- `sketch-to-image/src/app/globals.css`
- `sketch-to-image/src/app/page.tsx`
