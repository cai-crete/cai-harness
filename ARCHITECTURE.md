# ARCHITECTURE.md — 시스템 기술 구조 지도

> Agent는 이 파일 하나로 CAI/Project-10 시스템의 전체 구조를 파악합니다.

---

## 시스템 개요

CAI/Project-10은 건축 설계 워크플로우를 10개의 AI 노드로 자동화하는 시스템입니다.
각 노드는 독립된 Next.js 앱으로 구현되며, Claude API의 `system` 파라미터에 Principle Protocol을 주입하여 AI 동작을 제어합니다.
사용자는 각 노드에 이미지·텍스트·파라미터를 입력하고, AI가 생성한 건축 산출물(이미지, 도면, 텍스트)을 받습니다.

---

## 코드맵

각 노드는 독립된 객체입니다. 노드 간 관계성은 이 단계에서 다루지 않습니다.

| # | 노드명 | 단독 역할 |
|---|--------|----------|
| N01 | planner | 사업 타당성·리스크 다각도 검증 |
| N02 | writer | 고품질 건축 내러티브 텍스트 자동 생성 |
| N03 | sketch to plan | 스케치 → 건축적으로 타당한 2D 도면 |
| N04 | plan to volume | 2D 평면도 → 3D 매스(Massing) 모델 |
| N05 | plan to diagram | 2D/3D → 동선·조닝·채광 다이어그램 |
| N06 | sketch to image | 스케치 형태 유지 → 극사실주의 건축 사진 |
| N07 | image to elevation | 투시도 → 정사영 입면도 역설계 |
| N08 | style edit | 형태 유지 → 마감재·계절·시간대 변경 |
| N09 | change viewpoint | 완성 건물 → 다양한 카메라 앵글 시뮬레이션 |
| N10 | print | 전체 산출물 → 최종 증명서 자동 포맷팅 |

**노드 앱 내부 모듈 구조** (모든 노드 공통):

```
project.XX/
├── _context/          ← 노드 전용 하네스 (Protocol, Knowledge Docs)
│   ├── protocol-[name]-v[N].txt
│   └── [knowledge-doc].txt
├── app/
│   ├── page.tsx       ← 사용자 입력 UI
│   └── api/[node]/    ← Claude API 호출 라우트
└── lib/
    └── prompt.ts      ← buildSystemPrompt() 구현
```

---

## 레이어 구조 및 경계

| 레이어 | 표준 | 책임 |
|--------|------|------|
| **UI** | Next.js (App Router) + Tailwind CSS | 사용자 입력 수집, 결과 렌더링 |
| **API Route** | Next.js API Routes | 입력 검증, Claude API 호출, 응답 반환 |
| **AI Core** | Claude API (`claude-opus-4-6` 기본) | Protocol 실행, 산출물 생성 |
| **이미지 처리** | 노드별 별도 정의 | 입력 이미지 전처리, 출력 이미지 후처리 |
| **배포** | Vercel | 정적 자산 + 서버리스 함수 호스팅 |
| **패키지 매니저** | npm | 의존성 관리 |

**레이어 경계 규칙:**
- UI 레이어는 Claude API를 직접 호출하지 않는다 — 반드시 API Route를 경유한다
- API Route는 `buildSystemPrompt()`를 통해서만 시스템 프롬프트를 구성한다
- Protocol 내용은 코드에 하드코딩하지 않는다 — `_context/` 파일에서 로드한다

---

## 아키텍처 불변식

반드시 유지해야 하는 제약 — 어떤 이유로도 위반하지 않는다:

1. **Protocol 우선**: AI 동작은 항상 Protocol로 제어한다. 코드로 Protocol 결함을 우회하지 않는다
2. **주입 경로 단일화**: 시스템 프롬프트는 반드시 `buildSystemPrompt()`를 통해서만 구성된다
3. **노드 독립성**: 각 노드 앱은 다른 노드 앱에 의존하지 않는다
4. **버전 불삭제**: 이전 Protocol 버전 파일을 삭제하지 않는다
5. **스펙 선행**: product-spec 없이 노드 앱을 구현하지 않는다

**만들어서는 안 되는 의존성:**
- 노드 앱 → 다른 노드 앱 (직접 호출 금지)
- API Route → Claude API (buildSystemPrompt 없이 직접 호출 금지)

---

## 데이터 흐름

**노드 내 입력 → 출력 단계:**

```
1. 사용자 입력 (UI)
   └─ 이미지, 텍스트, 파라미터

2. API Route 수신
   └─ 입력 검증 + 형식 변환

3. 시스템 프롬프트 조합 (buildSystemPrompt)
   ┌─ Principle Protocol (필수)
   ├─ Knowledge Doc 1 (선택)
   └─ Knowledge Doc 2 (선택)
   → [Protocol]\n\n---\n\n[Knowledge Doc 1]\n\n---\n\n...

4. Claude API 호출
   └─ system: buildSystemPrompt(...)
      messages: [{ role: "user", content: 입력 데이터 }]

5. 응답 수신 + 후처리
   └─ 텍스트, 이미지, 구조화 데이터

6. UI 렌더링
   └─ 사용자에게 산출물 표시
```

**계층 충돌 규칙**: 상위 계층이 하위 계층을 항상 override합니다.

```
Principle Protocol  >  Knowledge Docs  >  User Input
     (불변 원칙)           (참조 지식)       (실행 명령)
```

**Agent가 구현하는 핵심 함수 (TypeScript)**:

```typescript
function buildSystemPrompt(
  principleProtocol: string,
  knowledgeDocs: string[] = []
): string {
  return [principleProtocol, ...knowledgeDocs].join("\n\n---\n\n");
}

const response = await anthropic.messages.create({
  model: "claude-opus-4-6",
  system: buildSystemPrompt(principleProtocol, knowledgeDocs),
  messages: [{ role: "user", content: userInput }],
  max_tokens: 4096,
});
```

---

## 핵심 타입 / 데이터 구조

Agent는 아래 NodeContract의 모든 필드가 product-spec에 정의되어 있을 때만 배포를 승인합니다.
미완성 필드가 있으면 배포를 차단하고 product-spec 작성을 먼저 요청합니다.

```typescript
interface NodeContract {
  nodeId: string;              // 예: "N09"
  nodeName: string;            // 예: "change viewpoint"
  phase: 1 | 2 | 3 | 4;
  input: {
    type: string;              // 예: "image + text"
    schema: object;
  };
  output: {
    type: string;              // 예: "image + analysis report"
    schema: object;
  };
  protocolVersion: string;     // 예: "v4"
  knowledgeDocs: string[];     // 함께 주입되는 지식문서 목록
  complianceChecks: string[];  // QUALITY_SCORE.md의 체크리스트 항목
}
```

---

## 횡단 관심사

모든 노드 앱에 공통으로 적용되는 비기능 요구사항:

**에러 처리**
- Claude API 호출 실패 시 사용자에게 명확한 오류 메시지를 반환한다
- Protocol 로드 실패는 앱 실행을 중단시키는 치명적 오류로 처리한다

**로깅**
- API Route에서 요청/응답 로그를 기록한다 (입력 타입, 토큰 수, 처리 시간)
- Protocol 버전을 로그에 함께 기록한다 (어떤 Protocol이 응답을 생성했는지 추적 가능)

**보안**
- Claude API 키는 환경변수로만 관리한다 (`ANTHROPIC_API_KEY`)
- 사용자 업로드 이미지는 서버에 저장하지 않는다 (메모리 처리 또는 즉시 삭제)
- 상세 기준: `docs/SECURITY.md` 참조

---

## Protocol 버전 관리 규칙

```
protocol-[node-name]-v[N].txt    ← 버전 명시 필수
```

| 규칙 | Agent 행동 |
|------|-----------|
| 이전 버전 보존 | 삭제하지 않는다 — 비교 기준 및 롤백 기반 |
| 버전 업 조건 | Stage B 동적 테스트 실패 케이스 발생 시 |
| 변경 로그 | 해당 노드 product-spec의 `## Protocol 버전 History`에 기록 |
| 배포 승인 | `RELIABILITY.md` Stage A + B 전체 통과 시만 가능 |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
