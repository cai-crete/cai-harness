# exec-plan-N27: 태블릿 화면 꽉 채움 설정

## 배경
iPad Safari에서 viewport 메타 태그 미설정으로 인해:
- 기본 980px 가상 너비로 렌더링 후 축소 표시 (화면에 꽉 차지 않음)
- `100vh`가 주소창·툴바 포함 높이 기준이라 하단이 잘림

## N27-A: viewport 메타 태그 추가 (layout.tsx)

Next.js App Router의 `viewport` export 방식 사용:

```ts
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

## N27-B: h-screen → h-dvh (page.tsx)

최외곽 div의 `h-screen` → `h-dvh`
- `dvh` = Dynamic Viewport Height
- Safari 주소창 높이를 제외한 실제 가시 영역 기준

## 파일 변경 목록
- `sketch-to-image/src/app/layout.tsx`
- `sketch-to-image/src/app/page.tsx`
