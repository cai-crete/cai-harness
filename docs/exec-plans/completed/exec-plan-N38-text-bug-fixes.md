---
id: N38
title: text tool 버그 수정 (4종)
status: active
created: 2026-04-22
---

## 목표

텍스트 도구의 4가지 버그 수정

## 버그 목록 & 원인 분석

### Bug 1: 드래그 위치에 텍스트 박스 생성되지 않음
- **원인**: 기존 floating textarea는 `canvasTransformStyle` 내 절대 좌표로 배치되나,
  `pointer-events: none` 래퍼와 z-index 레이어 분리로 인해 실제 위치와 시각적 위치가 어긋남.
  근본 원인: floating overlay 방식 자체의 구조적 문제.
- **해결**: Bug 3과 통합하여 in-place editing으로 전환

### Bug 2: 패닝 시 텍스트 박스 이동
- **원인**: floating textarea가 `canvasTransformStyle` 내부에 있어 캔버스 transform이 변경될 때 시각적 위치가 어긋남.
- **해결**: in-place editing에서는 textarea가 캔버스 아이템 div 내부에 있으므로 패닝 시 아이템과 함께 이동 → 올바른 동작

### Bug 3: 하얀색 텍스트 박스 불필요 → in-place 편집으로 변경
- **원인**: 현재 floating textarea overlay (`background: rgba(255,255,255,0.95)`)가 팝업처럼 뜸
- **해결**:
  - `textInput` state 제거
  - `editingTextId: string | null` state 추가
  - 텍스트 아이템 div 내부에 transparent textarea 렌더링
  - 드래그로 새 아이템 생성 시 즉시 edit mode 진입
  - 텍스트 모드에서 기존 텍스트 아이템 클릭 시 즉시 edit mode

### Bug 4: 텍스트 입력 중 캔버스 단축어 활성화
- **원인**: `window.addEventListener('keydown', onKey)` 핸들러가 textarea 포커스 여부를 확인하지 않음
- **해결**: `onKey` 핸들러 첫 줄에 `if (document.activeElement?.tagName === 'TEXTAREA') return;` 추가

## 구현 계획

### 1. 상태 변경
```diff
- const [textInput, setTextInput] = useState<{...} | null>(null);
- const textInputRef = useRef<{...} | null>(null);
- const textareaRef = useRef<HTMLTextAreaElement>(null);
+ const [editingTextId, setEditingTextId] = useState<string | null>(null);
+ const editingTextIdRef = useRef<string | null>(null);
+ const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);
```

### 2. commitTextEdit() 헬퍼 함수
- editingTextId가 있고 해당 아이템의 text가 비어있으면 아이템 삭제
- editingTextId 클리어

### 3. handlePointerDown (text mode)
- TEXTAREA 타겟 → return (기존)
- editingTextId가 있으면 → commitTextEdit() 후 클리어
- 기존 텍스트 아이템 hit → setEditingTextId(item.id), setSelectedItemIds([item.id])
- 빈 캔버스 → drag start (기존과 동일)

### 4. handlePointerUp (text drag finalize)
- 드래그 완료 시: CanvasItem 생성 → setCanvasItems → setEditingTextId(newItem.id)
- 클릭만 시: CanvasItem 생성 (default 200×40) → setEditingTextId(newItem.id)

### 5. 텍스트 아이템 렌더링
```tsx
// 기존
{item.text && textInput?.editingId !== item.id && <div>...</div>}

// 변경
{editingTextId === item.id ? (
  <textarea
    ref={inlineTextareaRef}
    autoFocus
    defaultValue={item.text ?? ''}
    onKeyDown={e => {
      e.stopPropagation(); // Bug 4 추가 방어
      if (e.key === 'Escape') commitTextEdit();
    }}
    onChange={e => setCanvasItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, text: e.target.value } : i)
    )}
    style={{
      position: 'absolute', inset: 0,
      background: 'transparent', border: 'none', outline: 'none',
      resize: 'none', padding: '8px 12px',
      fontFamily: 'sans-serif', fontSize: 14,
      pointerEvents: 'all', cursor: 'text',
    }}
  />
) : (
  item.text && <div style={...}>{item.text}</div>
)}
```

### 6. 포인터 이벤트 조건
```tsx
pointerEvents: (isGenerating || (canvasMode !== 'select' && editingTextId !== item.id)) ? 'none' : 'all'
```

### 7. select 모드 더블클릭 → edit
```tsx
onDoubleClick={e => {
  if (item.type === 'text') {
    e.stopPropagation();
    setEditingTextId(item.id);
  }
}}
```

### 8. 모드 전환 시 edit commit
- setCanvasMode 호출 전 commitTextEdit() 처리

### 9. 키보드 단축어 (Bug 4)
```ts
const onKey = (e: KeyboardEvent) => {
  if (document.activeElement?.tagName === 'TEXTAREA') return;
  ...
};
```

### 10. floating textarea overlay 제거
- textInput, textInputRef, textareaRef 관련 코드 전체 제거

## 파일 수정 대상
- `sketch-to-image/src/app/page.tsx` (단독)
