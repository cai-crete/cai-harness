import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sketch to Image — N08',
  description: 'CAI 하네스 N08: 스케치 → 극사실적 이미지 생성',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
