import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Trace | 旅行人生档案馆",
    template: "%s | Trace",
  },
  description:
    "Trace 是一个用于旅行规划、预算管理、足迹记录和旅行人生档案管理的个人旅行平台。",
  keywords: [
    "Trace",
    "旅行规划",
    "旅行日记",
    "预算管理",
    "足迹地图",
    "旅行记录",
  ],
  authors: [{ name: "Trace" }],
  creator: "Trace",
  openGraph: {
    title: "Trace | 旅行人生档案馆",
    description:
      "从旅行计划，到人生足迹。用 Trace 管理你的旅行、预算、行程和回忆。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trace | 旅行人生档案馆",
    description:
      "从旅行计划，到人生足迹。用 Trace 管理你的旅行、预算、行程和回忆。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
