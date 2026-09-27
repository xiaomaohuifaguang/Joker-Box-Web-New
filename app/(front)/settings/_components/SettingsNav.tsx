"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

// 设置导航项（模块级常量，避免 react-hooks/static-components）。
// 加设置页 = 这里加一项 + 建对应子路由。desc 仅桌面端显示。
const SETTINGS_NAV = [
  {
    href: "/settings/profile",
    label: "个人资料",
    desc: "头像、昵称与联系方式",
    icon: UserRound,
  },
  {
    href: "/settings/security",
    label: "账号安全",
    desc: "密码与登录安全",
    icon: ShieldCheck,
  },
] as const;

// 卡片面板导航：桌面粘性竖列（选中项 brand 填充），移动端顶部横滚 chip 条（藏副标题）。
// 选中态与 website 页分组导航一致（bg-brand text-background）。
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-surface p-1.5 md:flex-col md:overflow-visible">
      {SETTINGS_NAV.map(({ href, label, desc, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-brand font-medium text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex flex-col">
              <span>{label}</span>
              <span
                className={cn(
                  "hidden text-xs font-normal md:block",
                  active ? "text-background/70" : "text-muted-foreground/70",
                )}
              >
                {desc}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
