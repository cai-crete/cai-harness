# exec-plan-N30 — grid 겹침 수정 + undo 삭제 복원 + pen/eraser 값 + 아트보드 zoom/lock/grid

**노드**: sketch-to-image  
**날짜**: 2026-04-21  
**상태**: completed

---

## 요구사항 요약

| # | 항목 | 유형 | 상태 |
|---|------|------|------|
| N30-1 | 비정수 zoom 시 grid sub-pixel 겹침 현상 수정 | 버그 수정 | ✓ |
| N30-2 | undo 시 삭제한 item도 복원 | 버그 수정 | ✓ |
| N30-3 | pen/eraser 선택 가능 px 값 변경 | 값 변경 | ✓ |
| N30-4 | (정보) grid 투명도 값 | 출력 완료 | ✓ |
| N30-5 | 아트보드 좌상단 컨트롤 바: [+][-][lock] | 신규 기능 | ✓ |
| N30-6 | 아트보드 내부 grid | 신규 기능 | ✓ |

---

## 구현 완료 내역

### N30-1: InfiniteGrid.tsx
- `Math.round(12 * zoom/100)`, `Math.round(60 * zoom/100)` 정수화
- `backgroundPosition` 다중값 분리, minor 레이어 `minor/2` 오프셋

### N30-2: page.tsx handleDeleteItem
- `deleteImageFromDB(\`pixel_${id}\`)` 1줄 제거

### N30-3: LeftToolbar.tsx
- pen: `[1,2,4,6,8]` → `[0.5,1,2,4,6]`
- eraser: `[2,4,6,8,10]` → `[10,15,20,25,30]`

### N30-5: page.tsx
- `canvas.ts`: `contentScale?`, `locked?` 타입 추가
- `handlePointerDown`: `if (item.locked) return` 이동 방지
- 아이템 div: `overflow: hidden` (artboard/upload)
- 내부 content wrapper div: `transform: scale(contentScale/100)`, `transformOrigin: top left`
- 좌상단 컨트롤 바: ZoomIn/ZoomOut/Lock(Unlock) 버튼, 기존 우측 상단 컨트롤 바와 동일 스타일

### N30-6: page.tsx (N30-5-C와 통합)
- content wrapper 내부에 artboard grid overlay 배치
- minor `rgba(0,0,0,0.1)`, major `rgba(0,0,0,0.2)`, minor 오프셋 6px
