# Exec Plan — AGENTS.md 재정의: 범용 하네스 헌법 수립

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 하네스 핵심 문서 재정의
- **대상 파일**: `AGENTS.md` (루트)
- **시작일**: 2026-04-15

---

## 목표

현재 AGENTS.md는 Project-10 전용 메타데이터와 항목 나열 위주로 구성되어 있어,
개발자가 읽고 나서도 "그래서 내가 지금 무엇을 해야 하는가"를 즉시 파악하기 어렵다.

재정의 후 AGENTS.md는:
1. CAI 하네스를 사용하는 **모든 개발자·모든 프로젝트**에 공통 적용되는 **범용 헌법**이 된다.
2. **대분류 헌법 조항** 구조로 재편되어, 세션 시작 즉시 "무엇을 해야 하는지"가 명확히 드러난다.
3. AI가 명료하게 작동할 수 있는 **ROOM 개념**을 Protocol 설계 원칙으로 확립한다.

---

## 진단: 현재 AGENTS.md의 문제

| 문제 | 구체적 현상 |
|------|------------|
| 대분류 헌법 부재 | "이 하네스가 무엇인가"를 선언하는 최상위 조항이 없다 |
| 프로젝트 전용 잠금 | 첫 섹션부터 "Project-10", "건축 설계"가 등장 — 범용성 없음 |
| 워크플로우 비가시성 | 하네스 전체를 관통하는 핵심 흐름이 문서 어디에도 명시되지 않음 |
| ROOM 개념 부재 | AI가 어느 단계에서 무엇을 수행하는지 Protocol 설계 원칙으로 정의되지 않음 |
| 에이전트 역할 불명확 | A/B/C 에이전트 역할이 워크플로우와 연결되지 않고 독립적으로 나열됨 |

---

## 핵심 설계 결정

### 1. 대분류 헌법 구조 (조항 체계)

새 AGENTS.md는 `제N조` 형식의 최상위 헌법 조항으로 구성된다.
각 조항은 "이 하네스에서 변경할 수 없는 진실"을 담으며,
그 아래 세부 조항이 실행 방법을 규정한다.

```
제1조 — 하네스의 존재 이유 (The Mission)
제2조 — 보편 워크플로우 (The Immutable Flow)
제3조 — AI ROOM 원칙 (The Room Doctrine)
제4조 — 금지 행동 (Prohibitions)
```

---

### 2. 보편 워크플로우 (제2조)

CAI 하네스를 사용하는 모든 앱이 따르는 불변 흐름:

```
[UPLOAD]          →  [ANALYSIS/REASONING]        →  [USER INPUT]  →  [RESULT GENERATION]
이미지 or 텍스트       AI 개입                          사용자 판단        AI 개입
                       ANALYSIS ROOM                                   GENERATION ROOM
                       gemini-3.1-pro-preview                      ┌── 텍스트: gemini-3.1-pro-preview
                                                                    └── 이미지: gemini-3.1-flash-image-preview
```

이 흐름은 헌법 제1조처럼 고정된다. 어떤 프로젝트도 이 흐름을 벗어나지 않는다.

---

### 3. AI ROOM 원칙 (제3조 핵심)

"ROOM"은 Protocol 파일 내 AI 전용 작업 공간을 구조화한 명시적 블록이다.
개발자는 Protocol에 반드시 두 개의 ROOM을 정의해야 한다.

#### [ANALYSIS ROOM]
- **목적**: 업로드된 입력(이미지·텍스트)을 AI가 구조적으로 분석·추론하는 공간
- **AI 엔진**: `gemini-3.1-pro-preview`
- **위치**: Protocol 파일 내 `[ANALYSIS ROOM]` 헤더 블록
- **규칙**:
  - AI가 수행할 분석 축(Axis)을 명시한다 (예: 공간 구성, 동선, 채광)
  - 각 축에 대해 AI가 출력해야 할 형식을 지정한다
  - 불확실성 처리 방식(Failure Mode)을 명시한다
  - **금지**: 자유 형식 서술 — 모든 분석은 구조화된 필드로 출력

#### [GENERATION ROOM]
- **목적**: 분석 결과와 사용자 입력을 기반으로 결과물을 생성하는 공간
- **위치**: Protocol 파일 내 `[GENERATION ROOM]` 헤더 블록
- **결과물 유형별 규칙**:

| 결과물 유형 | AI 엔진 | GENERATION ROOM이 정의해야 할 것 |
|------------|---------|----------------------------------|
| 텍스트 | `gemini-3.1-pro-preview` | 출력 구조, 길이 제약, 금지 표현 |
| 이미지 | `gemini-3.1-flash-image-preview` | 이미지 프롬프트 생성 규칙, 스타일 파라미터, 품질 기준 |

---

## 새 AGENTS.md 섹션 구조 (상세)

```markdown
# AGENTS.md — CAI 하네스 헌법

## 제1조 — 하네스의 존재 이유
## 제2조 — 보편 워크플로우
## 제3조 — AI ROOM 원칙
  ### 3.1 [ANALYSIS ROOM] 정의 및 규칙
  ### 3.2 [GENERATION ROOM] 정의 및 규칙
  ### 3.3 ROOM이 없는 Protocol은 무효
## 제4조 — 금지 행동
  ### 4.1 Protocol 관련
  ### 4.2 ROOM 관련 (신규)
  ### 4.3 개발 프로세스 관련
## 부록 — ralph-wiggum 플러그인
## 부록 — 디렉토리 구조
```

---

## 제거할 내용 (현행 → 삭제)

| 현행 내용 | 삭제 이유 |
|----------|----------|
| `프로젝트 식별 정보` 테이블 (Project-10, 건축 설계 등) | 범용 헌법에 프로젝트 종속 정보 불가 → ARCHITECTURE.md 또는 product-spec으로 이동 |
| 에이전트 발동 파일 명시 (`loop-b-execution-agent.txt`) | 세션 루틴 섹션으로 통합, 헌법 본문에서 구현 세부사항 제거 |

---

## Progress

- [x] 2026-04-15 — 현행 AGENTS.md 백업 (`docs/references/agents-md-backup-20260415.md`)
- [x] 2026-04-15 — 제1조~제3조 작성 (하네스 미션, 보편 워크플로우, ROOM 원칙)
- [x] 2026-04-15 — 제4조 작성 (금지 행동 — Protocol·ROOM·개발 프로세스)
- [x] 2026-04-15 — 부록 통합 (ralph-wiggum, 디렉토리 구조)
- [x] 2026-04-15 — ARCHITECTURE.md AI Core 레이어 Gemini 모델로 교체 및 핵심 함수 예시 업데이트

---

## Surprises & Discoveries

- (구현 중 기록)

---

## Decision Log

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-15 | 조항 체계(`제N조`) 도입 | "대분류 헌법 부재"가 핵심 문제 — 법률 조항 구조가 위계 명확성을 가장 직접적으로 해결함 |
| 2026-04-15 | 프로젝트 식별 정보 제거 | AGENTS.md는 범용 헌법 → 프로젝트 종속 정보는 ARCHITECTURE.md로 분리 |
| 2026-04-15 | ROOM을 Protocol 내 명시적 블록으로 정의 | AI가 어느 단계에서 무엇을 해야 하는지 구조가 보여야 검증 가능 — 암묵적 설계는 검증 불가 |
| 2026-04-15 | 분석 엔진 = `gemini-3.1-pro-preview`, 이미지 생성 엔진 = `gemini-3.1-flash-image-preview` | 두 단계 모두 Gemini 계열 — 엔진이 확정되어야 ROOM의 입출력 계약이 명확해짐 |
| 2026-04-15 | 에이전트 정의를 워크플로우 단계에 앵커링 | 현재는 에이전트 역할이 워크플로우와 단절 — 단계 기반 재정의로 "내가 어느 단계에 있는가"가 역할을 결정하도록 |

---

## Outcomes & Retrospective

- **원래 목표 달성 여부**: [x] Yes  [ ] Partial  [ ] No
- **결과 요약**: 4조 헌법 구조(미션·워크플로우·ROOM 원칙·금지 행동)로 재정의 완료. 범용 하네스 헌법으로 전환, ROOM 블록 규범 확립, Gemini 엔진 확정 반영. ARCHITECTURE.md 동기화 완료.
- **다음 작업에 반영할 것**: Protocol 작성 시 `[ANALYSIS ROOM]` / `[GENERATION ROOM]` 블록을 필수 템플릿으로 강제. Loop A의 ROOM 체크 4개 항목을 `loop-a-verification-agent.txt`에 추가 반영 필요.

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
