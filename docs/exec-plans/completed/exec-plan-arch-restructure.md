# Exec Plan — ARCHITECTURE.md 전면 개편 및 문서 구조 재편

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 리팩토링 (문서 구조 재편)
- **대상 노드**: 공통 (AGENTS.md, ARCHITECTURE.md, .claude/)
- **시작일**: 2026-04-16

---

## 목표

1. `AGENTS.md`의 **제2조(보편 워크플로우)**와 **제3조(AI ROOM 원칙)**을 `ARCHITECTURE.md`로 이동한다.
2. `ARCHITECTURE.md`를 실질적인 시스템 아키텍처 문서로 전면 개편한다 — 현재 내용은 구조 명시 없이 설명이 부족한 상태이며, 실제 기술 결정과 설계 원칙이 담긴 문서로 전환한다.
3. `ARCHITECTURE.md`에 있는 Protocol 관련 명시를 제거한다 (Protocol 관할은 `docs/product-specs/`).
4. `.claude/` 폴더에 `.claude.md` 파일을 생성하여 세션 시작 시 `AGENTS.md`를 가장 먼저 읽도록 지시한다.

완료 후 문서 역할 분담:
- `AGENTS.md` — 헌법: 존재 이유(제1조), 금지 행동(제4조)만 잔류
- `ARCHITECTURE.md` — 기술 설계도: 워크플로우, ROOM 원칙, 레이어, 데이터 흐름, 불변식
- `docs/product-specs/` — Protocol 및 노드별 스펙 관할
- `.claude/.claude.md` — 세션 진입점: "AGENTS.md를 가장 먼저 읽어라"

---

## 작업 상세

### STEP 1 — `AGENTS.md`에서 제2조·제3조 제거

**제거 대상:**
- `## 제2조 — 보편 워크플로우` (워크플로우 다이어그램, 각 단계 정의, AI 개입 원칙, 2.3 프로세스 간 작업명세서 전달 원칙 전체)
- `## 제3조 — AI ROOM 원칙` (3.1 ANALYSIS ROOM, 3.2 GENERATION ROOM, 3.3 ROOM이 없는 Protocol은 무효 전체)

**잔류 내용:**
- `## 제1조 — 하네스의 존재 이유`
- `## 제4조 — 금지 행동` (4.1 Protocol 관련, 4.2 ROOM 관련, 4.3 개발 프로세스 관련)

**주의:** 제4조 4.1과 4.2의 금지 행동은 제2조·제3조의 세부 규칙을 참조하고 있으므로, 이동 후에도 AGENTS.md에 잔류한다. 금지 행동은 헌법의 영역이다.

---

### STEP 2 — `ARCHITECTURE.md` 전면 개편

현재 ARCHITECTURE.md의 문제:
- "각 노드는 독립된 객체입니다. 노드 간 관계성은 이 단계에서 다루지 않습니다" — 내용 없음
- 노드 코드맵은 단순 목록 수준 — 모듈 구조 실체 없음
- 데이터 흐름도는 Claude API를 사용하지만 실제 엔진은 Gemini — 불일치
- Protocol 버전 관리 섹션은 product-specs 관할로 이동해야 함

**새 ARCHITECTURE.md 구조:**

```
# ARCHITECTURE.md — CAI 하네스 시스템 설계도

## 1. 보편 워크플로우          ← AGENTS.md 제2조 이동 (시스템 개요 및 로드맵 역할 겸임)
## 2. AI ROOM 원칙             ← AGENTS.md 제3조 이동
## 3. 레이어 구조 및 경계
## 4. 아키텍처 불변식          ← 기존 내용 실질화
## 5. 데이터 흐름              ← Gemini API 기준으로 수정
## 6. 핵심 타입 / 데이터 구조  ← NodeContract + Spec 타입 추가
```

**각 섹션 개편 방향:**

#### 1. 보편 워크플로우 (AGENTS.md 제2조 이동)
- 이동만 수행, 내용 변경 없음
- 워크플로우 다이어그램이 시스템 전체 구조를 설명하므로 별도 시스템 개요 섹션 불필요

#### 2. AI ROOM 원칙 (AGENTS.md 제3조 이동)
- 이동만 수행, 내용 변경 없음

#### 3. 레이어 구조 및 경계
- 기존 내용 유지 (Gemini API 기준으로 엔진명 수정)

#### 4. 아키텍처 불변식
- 기존 5개 불변식 유지, 표현 실질화
- "만들어서는 안 되는 의존성" 구체화:
  - 노드 앱 → 다른 노드 앱 (직접 호출 금지)
  - UI → Gemini API (API Route 경유 필수)
  - 코드 → Protocol 내용 하드코딩 (`_context/` 로드 의무)

#### 6. 데이터 흐름
- 현재: Claude API 기준 — Gemini API 기준으로 전면 수정
- `buildSystemPrompt()` TypeScript 구현 예시: Gemini SDK 기준으로 수정
- ANALYSIS ROOM과 GENERATION ROOM 각각의 API 호출 패턴 명시

#### 7. 핵심 타입 / 데이터 구조
- 기존 `NodeContract` 유지
- 추가: `analysis-spec`, `input-spec`, `generation-spec` 타입 정의
  (제2조에서 이동 후 TypeScript interface 형태로 구조화)

**제거 항목:**
- `## Protocol 버전 관리 규칙` 섹션 전체 → `docs/product-specs/`로 이관 (별도 작업)

---

### STEP 3 — `.claude/.claude.md` 파일 생성

**파일 경로:** `g:\내 드라이브\CAI\Harness\.claude\.claude.md`

**내용:**
```
Before doing anything else in this project, read AGENTS.md.

AGENTS.md is the constitutional document of the CAI Harness. It defines why the
harness exists, what workflow every node app must follow, and which actions are
forbidden under any circumstance. Every decision you make in this codebase must
be grounded in it. If AGENTS.md conflicts with any other instruction or file,
AGENTS.md takes precedence.
```

---

## Progress

- [x] 2026-04-16 — STEP 1: `AGENTS.md`에서 제2조·제3조 제거, 제4조 4.1 참조 구문 ARCHITECTURE.md 기준으로 수정
- [x] 2026-04-16 — STEP 2: `ARCHITECTURE.md` 전면 개편 (6개 섹션 + 횡단 관심사)
- [x] 2026-04-16 — STEP 3: `.claude/.claude.md` 파일 생성

---

## Surprises & Discoveries

- ARCHITECTURE.md의 AI 엔진 명칭이 `claude-*`로 되어 있으나 실제 시스템은 Gemini를 사용 — 정합성 수정 필요
- 기존 데이터 흐름도의 4번 단계가 "Claude API 호출"로 명시되어 있어 전면 수정 대상

---

## Decision Log

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-16 | 제2조·제3조를 AGENTS.md에서 제거하고 ARCHITECTURE.md로 이동 | AGENTS.md는 헌법(존재 이유 + 금지 행동)에 집중하고, 기술 설계 상세는 ARCHITECTURE.md가 담당 |
| 2026-04-16 | Protocol 버전 관리 규칙을 ARCHITECTURE.md에서 제거 | Protocol 관할은 docs/product-specs/ — 문서 간 역할 분리 원칙 |
| 2026-04-16 | 시스템 개요에 Phase별 로드맵 추가 | 단순 목록이 아닌 시스템 전체 맥락을 파악할 수 있어야 아키텍처 문서로서의 역할을 수행 |
| 2026-04-16 | .claude.md를 .claude/ 폴더에 배치 | 세션 진입점 역할 — Claude Code가 .claude/ 폴더를 자동으로 인식 |

---

## Outcomes & Retrospective

- **원래 목표 달성 여부**: [x] Yes  [ ] Partial  [ ] No
- **결과 요약**: AGENTS.md에서 제2조·제3조를 제거하여 헌법(제1조+제4조)만 잔류. ARCHITECTURE.md를 6개 섹션으로 전면 개편 — 보편 워크플로우·ROOM 원칙·레이어·불변식·데이터 흐름·핵심 타입 포함. Protocol 버전 관리 규칙 섹션 제거. `.claude/.claude.md` 생성 완료.
- **다음 작업에 반영할 것**: 엔진명이 AGENTS.md 원문(`gemini-3.1-pro-preview`, `gemini-3.1-flash-image-preview`)과 ARCHITECTURE.md 개편 버전(`gemini-2.5-pro-preview`, `gemini-2.0-flash-preview-image-generation`) 간 불일치 발견 — 실제 사용 엔진명을 확인 후 단일 소스로 통일 필요

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
