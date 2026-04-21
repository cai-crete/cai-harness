---
id: N34
title: 우측 사이드바 버튼 border-radius rounded-[0.75rem] 변경
status: active
created: 2026-04-21
---

## 목표
우측 사이드바 내 모든 버튼/컨테이너의 `rounded-full`을 `rounded-[0.75rem]`으로 교체한다.

## 변경 범위

### sketch-to-image/src/components/RightSidebar.tsx
| 라인 | 대상 | 변경 |
|------|------|------|
| L50 | 헤더 레이블 컨테이너 div | `rounded-full` → `rounded-[0.75rem]` |
| L60 | 패널 토글 버튼 | `rounded-full` → `rounded-[0.75rem]` |

### sketch-to-image/src/components/panels/SketchToImagePanel.tsx
| 라인 | 대상 | 변경 |
|------|------|------|
| L49 | `toggleBtn` 헬퍼 (MODE 버튼) | `rounded-full` → `rounded-[0.75rem]` |
| L97 | CRE-TE STYLE 버튼 (A~NONE) | `rounded-full` → `rounded-[0.75rem]` |
| L141 | Aspect Ratio 버튼 | `rounded-full` → `rounded-[0.75rem]` |
| L154 | Resolution 버튼 | `rounded-full` → `rounded-[0.75rem]` |
| L166 | GENERATE 버튼 | `rounded-full` → `rounded-[0.75rem]` |

## 변경하지 않는 것
- `rounded-full`이 아닌 다른 rounded 클래스 (e.g., `rounded-[1.25rem]`, `rounded-md`, `rounded-full` on close 버튼 inside style detail card)
- 패널 컨테이너 자체의 `rounded-[1.25rem]`

## 작업 단계
1. [ ] RightSidebar.tsx — L50, L60 수정
2. [ ] SketchToImagePanel.tsx — L49, L97, L141, L154, L166 수정
3. [ ] exec-plan → completed/ 이동
4. [ ] claude-progress.txt 갱신
