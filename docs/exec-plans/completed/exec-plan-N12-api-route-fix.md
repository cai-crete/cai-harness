---
id: N12
title: API Route 500 에러 수정 — 프로토콜 파일 경로
date: 2026-04-17
status: active
---

## 문제

Generate 클릭 시 `/api/sketch-to-image` 500 Internal Server Error 발생.

## 원인

`src/lib/prompt.ts:10` 경로 오류:
- 현재: `join(process.cwd(), 'n08-sketch-to-image', '_context')`
- `process.cwd()` = `sketch-to-image/` (Next.js 앱 루트)
- 실제 파일 위치: `sketch-to-image/_context/protocol-sketch-to-image-v2.3.txt`
- 결과: `ENOENT` → "Protocol initialization failed" 500 반환

## 수정

```ts
// Before
const contextDir = join(process.cwd(), 'n08-sketch-to-image', '_context');
// After
const contextDir = join(process.cwd(), '_context');
```

## 파일
- `sketch-to-image/src/lib/prompt.ts`
