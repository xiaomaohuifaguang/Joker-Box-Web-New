import type { ReactNode } from "react";
import { AiChatWidget } from "@/components/ai-chat/AiChatWidget";
import { SystemPromptBanner } from "@/components/SystemPromptBanner";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";

// 前台布局：Header + 全局公告横幅（有生效中且未读的系统提示才渲染）+ 中部（随路由切换的
// {children}）+ Footer + AI 会话助手（登录可见）。
export default function FrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <SystemPromptBanner />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <AiChatWidget />
    </div>
  );
}
