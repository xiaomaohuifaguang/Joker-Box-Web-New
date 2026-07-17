import type { ReactNode } from "react";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";

// 前台布局：Header + 中部（随路由切换的 {children}）+ Footer。
export default function FrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
