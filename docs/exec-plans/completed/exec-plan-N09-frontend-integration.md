# Exec Plan — N08 Frontend Integration

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.

---

## 개요

- **작업 유형**: 프론트엔드 통합
- **대상 노드**: N08 sketch-to-image
- **시작일**: 2026-04-17
- **전제 조건**: Loop B PASS, DEPLOYMENT APPROVED (exec-plan-N08 완료)

---

## 목표

1. Next.js 프로젝트 설정 (package.json, next.config.ts, tsconfig.json)
2. `useBlueprintGeneration` hook → `/api/sketch-to-image` 엔드포인트 연결
3. APP-v2.tsx 기반 무한 캔버스 UI 구현 (파일 분리 + Tailwind 전환)
4. handleGenerate 구현: path 합성 → API 호출 → 결과 캔버스 배치
5. exec-plan-N08 → completed/ 이동

## 모드 매핑 (승인 확정)
- UI `CONCEPT` → Protocol Mode A (Active Shaping)
- UI `DETAIL` → Protocol Mode B (Passive Preservation)
- 두 모드 모두 API `viz_mode` 파라미터로 그대로 전달 (폴백 없음)

---

## Feature List

```json
{
  "feature_list": [
    { "id": "F01", "feature": "Next.js 프로젝트 설정 파일 생성", "passes": null },
    { "id": "F02", "feature": "useBlueprintGeneration hook 구현 (API 호출)", "passes": null },
    { "id": "F03", "feature": "App UI 구현 (canvas + 파라미터 + 결과)", "passes": null },
    { "id": "F04", "feature": "exec-plan-N08 completed/ 이동", "passes": null }
  ]
}
```

---

## Progress

- [ ] 2026-04-17 — Next.js 프로젝트 설정 파일 생성
- [ ] 2026-04-17 — useBlueprintGeneration hook 구현
- [ ] 2026-04-17 — App UI 구현
- [ ] 2026-04-17 — exec-plan-N08 completed/ 이동

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
