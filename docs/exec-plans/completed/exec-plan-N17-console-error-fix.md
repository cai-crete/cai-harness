# exec-plan N17 — 콘솔 오류 3건 분석 및 수정

**날짜:** 2026-04-18  
**상태:** completed  
**담당:** Claude

---

## 오류 분석

### [E1] Critical — 503 API 오류 (해결됨)
- **원인 A:** primary 모델명 `gemini-3.1-*` 존재하지 않음 → fallback으로 넘어감  
- **원인 B:** Vercel 환경변수 `GEMINI_API_KEY` 미설정  
- **해결:** Vercel 대시보드에서 `GEMINI_API_KEY` 환경변수 추가 후 재배포

### [E2] Medium — Canvas2D willReadFrequently 경고
- **원인:** `getContext('2d')` 호출 시 옵션 누락  
- **상태:** 사용자 확인 후 해결

### [E3] Low — Tracking Prevention (jsDelivr CDN)
- **원인:** globals.css에서 Pretendard CDN 로드  
- **상태:** 사용자 확인 후 해결
