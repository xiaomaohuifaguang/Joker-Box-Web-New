import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { UserBootstrap } from "@/components/UserBootstrap";
import { DesktopGuard } from "@/components/DesktopGuard";
import { DesktopUpdater } from "@/components/DesktopUpdater";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Joker Box",
};

// 首屏绘制前根据 localStorage 同时套 .dark（明暗）和 data-theme（预设），避免闪烁。
const themeInit = `(function () {
  try {
    var s = localStorage.getItem('theme');
    var dark = s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
    var p = localStorage.getItem('theme-preset');
    if (p) document.documentElement.setAttribute('data-theme', p);
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <UserBootstrap />
        <DesktopGuard />
        <DesktopUpdater />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
