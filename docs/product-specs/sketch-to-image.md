# Node Spec — sketch-to-image

> 파일명: `sketch-to-image.md`
> Protocol 버전 업 시 하단 `## Protocol 버전 History` 섹션에 변경 내용을 기록합니다.

---

## 노드 개요

| 항목 | 내용 |
|------|------|
| 이름 | sketch-to-image |
| Phase | 3 |
| Protocol 버전 | v2.3 |

---

## 단독 역할

사용자가 그린 스케치를 극사실적인 이미지로 변환하는 디자인 툴.
스케치의 구조·공간·재질 의도를 분석하여, 사실적 렌더링 이미지를 생성한다.

## 플랫폼 역할

CAI 파이프라인의 Phase 3 노드로, 스케치 업로드 → AI 분석 → 사용자 파라미터 입력 → 극사실적 이미지 생성의 전체 흐름을 단독 실행한다.

---

## 입력 계약 (Input Contract)

| 항목 | 타입 | 필수 여부 | 설명 |
|------|------|----------|------|
| `sketch_image` | base64 image | 필수 | 캔버스에 그린 스케치 이미지 (또는 업로드 이미지) |
| `user_prompt` | string | 선택 | 생성 방향 보충 텍스트 (예: "warm lighting, evening") |
| `viz_mode` | enum: `CONCEPT` \| `DETAIL` | 필수 | 시각화 모드 — CONCEPT(Mode A) / DETAIL(Mode B) |
| `style_mode` | enum: StyleKey \| `NONE` | 선택 | 적용할 스타일 키 (없으면 NONE) |
| `resolution` | enum: `NORMAL QUALITY` \| `HIGH QUALITY` | 필수 | 출력 이미지 해상도 등급 |
| `aspect_ratio` | string (예: `4:3`, `16:9`, `1:1`) | 필수 | 출력 이미지 비율 |

**입력 예시:**
```
sketch_image: <캔버스 드로잉 base64>
user_prompt: "cozy interior, warm light"
viz_mode: CONCEPT
style_mode: NONE
resolution: NORMAL QUALITY
aspect_ratio: 4:3
```

---

## 출력 계약 (Output Contract)

| 항목 | 타입 | 설명 |
|------|------|------|
| `generated_image` | base64 image | 극사실적으로 변환된 결과 이미지 |
| `analysis_report` | JSON + Markdown | Blueprint Realization Report — 메타인지 분석, 공간 해독, 최종 프롬프트, Reality Check 포함 |

> **⚠️ 구조 비고:** Protocol v2.3은 5-ROOM 커스텀 구조(Definition / Strategy / Logic / Execution / Validation)를 사용합니다.
> ROOM 1–3이 ANALYSIS 역할, ROOM 4–5가 GENERATION 역할을 수행합니다.

**출력 예시:**
```markdown
# 🏛️ Blueprint Realization Report v3.0

## 1. Metacognitive Analysis
* Diagnosis: Mode B (Detail Sketch)
* Design Strategy: Passive Preservation

## 2. Spatial & Logic Decoding
* Geometry: 중앙 계단형 매스, 창문 간격 일정

## 3. Final Execution Prompt
/imagine prompt: [Layer 1] ... :: [Layer 2] Shot on Fujifilm GFX 100S ... :: [Layer 3] ... :: [Layer 4] --no (...) --style raw --v 6.0
```

---

## Protocol 구성

| 파일 | 유형 |
|------|------|
| `protocol-sketch-to-image-v2.3.txt` | Principle Protocol (Loop A PASS, 배포본) |
| `protocol-sketch-to-image-v2.2.txt` | 이전 버전 (보존) |

---

## 컴플라이언스 체크리스트

```
[ ] Pre-Step: sketch_image가 유효한 이미지인지 확인
[ ] Step 1 (ANALYSIS ROOM): 공간 구성(spatial_composition) 축 분석 완료
[ ] Step 2 (ANALYSIS ROOM): 재질 의도(material_intent) 축 분석 완료
[ ] Step 3 (ANALYSIS ROOM): 조명 단서(lighting_cue) 축 분석 완료
[ ] Step 4 (ANALYSIS ROOM): analysis-spec JSON 출력 완료
[ ] Step 5 (GENERATION ROOM): analysis-spec + user_prompt + style_mode 통합
[ ] Step 6 (GENERATION ROOM): 극사실적 이미지 생성 (gemini-3.1-flash-image-preview)
[ ] Step 7 (GENERATION ROOM): generation-spec JSON 출력 완료
[ ] Immutable Constants: 스케치의 공간 구조·비율 변형 금지
[ ] Boundary Resolution: 분석 불가 축은 failure_modes에 기록, 생성 단계에서 안전 기본값 사용
```

---

## 알려진 실패 패턴

| 패턴 | 재현 조건 | 처방 |
|------|----------|------|
| 비율 변형 | 세로형 스케치를 가로형으로 출력 | Immutable Constants에 aspect_ratio 고정 명시 |
| 스케치 무시 | 복잡한 user_prompt가 스케치를 override | GENERATION ROOM에서 스케치 분석 결과 우선순위 강제 |

---

## Protocol 버전 History

| 버전 | 날짜 | 변경 이유 | Stage B 결과 |
|------|------|----------|-------------|
| v2.2 | 2026-04-17 | 사용자 제공 Protocol 적용 (5-ROOM 구조) | Loop A FAIL (P1~P4 결함) |
| v2.3 | 2026-04-17 | Loop A 수정: SPEC_OUTPUT 추가, FM IF-THEN 형식화, Gemini 엔진 명시 | Loop A PASS (5/5) |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
