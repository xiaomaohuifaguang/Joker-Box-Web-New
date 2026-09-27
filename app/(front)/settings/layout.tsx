import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/components/Container";
import { RequireAuth } from "@/components/RequireAuth";
import { SettingsNav } from "./_components/SettingsNav";

export const metadata: Metadata = { title: "个人设置" };

// 个人设置壳：仅登录守卫（不查 authPaths，布局级包一次，子路由切换不重复闪 404）。
// 左竖导航（桌面粘性、移动端折叠为顶部横滚卡片条）+ 右内容。加设置页 = 建子路由 + SettingsNav 的 SETTINGS_NAV 加一项。
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Container className="max-w-5xl flex-1 py-8 md:py-12">
        <header className="mb-6 md:mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            个人设置
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的账号资料与安全设置。
          </p>
        </header>
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <aside className="md:sticky md:top-20 md:w-60 md:flex-none md:self-start">
            <SettingsNav />
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Container>
    </RequireAuth>
  );
}
