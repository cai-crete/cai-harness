# exec-plan N28 — 텍스트 드래그 선택 방지 + 펜 획 DPR 고해상도

**날짜:** 2026-04-19  
**노드:** sketch-to-image  

---

## 문제 분석

### 문제 1: 텍스트 드래그 선택
- **현상:** iPad에서 RightSidebar "SKETCH TO IMAGE" 레이블 등 UI 텍스트가 펜/손가락 드래그 시 선택(하이라이트)됨
- **원인:** 캔버스 영역 div에만 `userSelect: 'none'` 적용. RightSidebar, AppHeader 등 외부 영역은 미적용
- **파일:** `sketch-to-image/src/app/page.tsx` line 965 (최외곽 div)

### 문제 2: 펜 획 해상도 저하
- **현상:** iPad(DPR=2) 레티나 디스플레이에서 펜 획이 흐릿하게 렌더링됨
- **원인:** sketch canvas 내부 버퍼가 CSS 픽셀 기준(842×595)으로 설정됨. 레티나에서는 물리 픽셀(1684×1190)로 설정해야 선명
- **파일:** `sketch-to-image/src/app/page.tsx` lines 1056–1057 (canvas ref 초기화)

---

## 수행 계획

### N28-A: 전역 텍스트 선택 방지
**대상:** `sketch-to-image/src/app/page.tsx` line 965
- 최외곽 div에 Tailwind `select-none` 클래스 추가
- textarea 등 실제 입력 요소는 자체적으로 selection을 관리하므로 별도 처리 불필요

### N28-B: 스케치 캔버스 DPR 고해상도 적용
**대상:** `sketch-to-image/src/app/page.tsx` lines 1052–1091 (canvas ref callback)

변경 내용:
1. `el.width/height`를 `item.width * dpr × item.height * dpr` 물리 픽셀로 설정
2. 크기 변경 시 `ctx.scale(dpr, dpr)` 적용 (context transform 리셋 후 1회 재적용)
3. IndexedDB 픽셀 복원 시 `ctx.drawImage(img, 0, 0, item.width, item.height)` — CSS 좌표계 기준으로 수정 (DPR scale된 context에서 CSS 좌표로 그려야 올바른 물리 픽셀로 매핑됨)
4. `canvasDprInitRef` Set으로 초기화 완료 추적 → 렌더 반복 시 이중 scale 방지

**드로잉 좌표계 변환 불필요:**
- `getArtboardLocal()`이 반환하는 좌표는 캔버스/CSS 좌표계 기준
- context에 `scale(dpr, dpr)` 적용 시 CSS 좌표가 자동으로 물리 픽셀로 매핑됨
- strokeWidth도 CSS space 기준이므로 DPR scale이 시각적 굵기를 유지하며 고해상도로 렌더링

---

## 영향 범위
- `sketch-to-image/src/app/page.tsx` — 단일 파일 수정
- 기존 IndexedDB 저장 데이터: 저해상도 이미지는 고해상도 canvas에 자동 업스케일 복원 (허용 가능한 트레이드오프, 이후 저장부터 고해상도로 누적)
