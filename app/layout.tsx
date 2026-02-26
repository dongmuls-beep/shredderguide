import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

export const metadata: Metadata = {
  title: "카피어랜드 문서세단기 선택 AI 에이전트",
  description: "사용 인원, 세단량, 예산 기반으로 문서세단기 3종을 추천하는 모바일 우선 가이드"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={spaceGrotesk.variable}>
        <div className="atmosphere" aria-hidden="true" />
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
