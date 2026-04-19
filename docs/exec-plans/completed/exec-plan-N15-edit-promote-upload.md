---
id: N15
title: sketch_generated 편집(+) 버튼 + 플로팅 바 줌 범위 제한
status: in-progress
date: 2026-04-17
---

## 목적

1. sketch_generated 플로팅 컨트롤 바에 [편집(+)] 버튼 추가
   - 클릭 시 아이템 type → 'upload' 승격, canvas mode → 'pen' 전환
2. 플로팅 바 크기 줌 연동 범위 제한: 50% ~ 150% (이 구간 밖에서는 고정)

## 플로팅 바 변경

| 대상 | 기존 | 변경 후 |
|------|------|---------|
| sketch_generated | [다운로드] [휴지통] | [편집(+)] [다운로드] [휴지통] |
| artboard | [이미지교체] [다운로드] [휴지통] | 변경 없음 |

## 편집(+) 클릭 동작

1. 히스토리 저장
2. 해당 아이템 type → 'upload' 변경
3. setCanvasMode('pen') 전환

## 플로팅 바 줌 범위 제한

```tsx
// 기존
const ctrlIconSize = 16 / scale;

// 변경
const barScale = clamp(scale, 0.5, 1.5);
const ctrlIconSize = 16 / barScale;
const ctrlBtnSize  = 32 / barScale;
const ctrlBarH     = 44 / barScale;
const ctrlGap      = 6  / barScale;
const ctrlPadX     = 8  / barScale;
```

→ 줌 50% 이하: 바 크기 고정(50% 기준)
→ 줌 150% 이상: 바 크기 고정(150% 기준)

## 연쇄 수정 — upload 타입 활성화

'upload' 타입이 artboard처럼 스케치 가능하도록:

1. **픽셀 캔버스 오버레이**: `item.type === 'artboard'` → `artboard || upload`
2. **findArtboardAt**: `item.type === 'artboard'` → `artboard || upload`
3. **handleGenerate**: artboard와 동일 처리에 upload 포함

## 수정 파일

- `sketch-to-image/src/app/page.tsx`
