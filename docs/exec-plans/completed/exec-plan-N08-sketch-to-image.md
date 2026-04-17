# Exec Plan — N08 sketch-to-image 노드 개발

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 새 기능 (노드 개발)
- **대상 노드**: N08 sketch-to-image
- **시작일**: 2026-04-17

---

## 목표

기존 App.tsx 코드베이스에 CAI 하네스 Protocol을 적용하여, 스케치 → 극사실적 이미지 생성 워크플로우를 ANALYSIS ROOM / GENERATION ROOM 구조로 재정의한다.
Protocol 배포 후 AGENT B 검증(Loop A + Loop B)을 통과하여 배포 승인을 받는다.

---

## 컨텍스트 — 기존 코드 구조

App.tsx 분석 결과:
- `useBlueprintGeneration` hook이 실제 생성 로직을 담당
- `generate(canvasRef, originalImage, userPrompt, resolution, aspectRatio, vizMode, styleMode)` 호출
- 결과: `generatedImage` (base64), `analysisReport` (JSON)
- 노드 폴더: `sketch-to-image/`
- Protocol 위치: `sketch-to-image/_context/protocol-sketch-to-image-v1.txt`

---

## Feature List

```json
{
  "feature_list": [
    { "id": "F01", "feature": "product-spec 작성 (N08-sketch-to-image.md)", "passes": true },
    { "id": "F02", "feature": "노드 폴더 구조 생성 (sketch-to-image/_context/)", "passes": true },
    { "id": "F03", "feature": "Protocol 파일 저장 (protocol-sketch-to-image-v2.2.txt)", "passes": true },
    { "id": "F04", "feature": "Loop A self-check (구조 완결성 · 내부 일관성)", "passes": true },
    { "id": "F05", "feature": "loop-b-handoff 파일 작성", "passes": true },
    { "id": "F06", "feature": "AGENT B 검증 — Loop A (/ralph-loop) PASS", "passes": true },
    { "id": "F07", "feature": "AGENT B 검증 — Loop B (/code-reviewer) PASS", "passes": true }
  ]
}
```

---

## Progress

- [x] 2026-04-17 — product-spec (N08-sketch-to-image.md) 작성 완료
- [x] 2026-04-17 — exec-plan 생성 완료
- [x] 2026-04-17 — 노드 폴더 구조 생성 (sketch-to-image/_context/, src/, .env.local)
- [x] 2026-04-17 — Protocol v2.2 저장 (사용자 제공)
- [x] 2026-04-17 — Loop A self-check 완료 (하네스 표준 ROOM 블록 불일치 발견 — handoff에 명시)
- [x] 2026-04-17 — loop-b-handoff 작성 완료
- [x] 2026-04-17 — Loop A Iter 1: FAIL (4개 결함 발견)
- [x] 2026-04-17 — Protocol v2.3 작성 (4개 수정 완료)
- [x] 2026-04-17 — Loop A Iter 2: PASS (5/5) — <promise>VERIFIED</promise>
- [x] 2026-04-17 — Loop B Iter 1: FAIL (MID — retry policy 미구현)
- [x] 2026-04-17 — route.ts withRetry 추가 (max 2회, 지수 백오프)
- [x] 2026-04-17 — Loop B Iter 2: PASS — DEPLOYMENT APPROVED

---

## Surprises & Discoveries

- App.tsx에 `originalImage` state가 별도 존재 — 캔버스 드로잉과 "이미 있는 이미지 편집" 두 케이스 모두 지원
- `handleEdit()`: 생성된 이미지를 다시 캔버스에 로드하여 재편집 가능 (순환 워크플로우)
- Protocol v2.2는 Midjourney `/imagine prompt` 텍스트를 최종 출력으로 정의 — App.tsx의 이미지 출력 기대와 불일치
- Protocol이 하네스 표준 [ANALYSIS ROOM]/[GENERATION ROOM] 블록명 미사용 — 5-ROOM 커스텀 구조
- SPEC_OUTPUT 필드 없음 — Process Spec 전달 체인 미정의 상태

---

## Decision Log

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-17 | Protocol Knowledge Doc 없이 Principle Protocol 단독 구성 | 초기 v1은 단순 구조 우선; 스타일 데이터가 확정되면 Knowledge Doc 추가 예정 |
| 2026-04-17 | ANALYSIS ROOM 3축: spatial_composition / material_intent / lighting_cue | 극사실적 변환에 필수적인 3가지 정보 — 구조, 재질, 조명 |

---

## Outcomes & Retrospective

> 작업 완료 후 작성

- **원래 목표 달성 여부**: [ ] Yes  [ ] Partial  [ ] No
- **결과 요약**: —
- **다음 작업에 반영할 것**: —

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
