"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useUser } from "@/hooks/useUser";
import { UserMenu } from "./UserMenu";
import { ThemeSelect } from "./ThemeSelect";
import { Button } from "@/components/ui/button";

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; children?: NavChild[] };

// 需要登录且 authPaths 含对应路由才显示的导航项。支持父菜单 + 子菜单（hover 展开）。
const authNavItems: NavItem[] = [
  { href: "/website", label: "收藏网站" },
  {
    href: "/tools",
    label: "工具箱",
    children: [
      { href: "/tools/cron", label: "cron 表达式" },
      { href: "/tools/jsonFormat", label: "JSON 格式化" },
    ],
  },
];

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative text-sm transition-colors hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-1.5 left-0 h-px w-full bg-brand" />
      )}
    </Link>
  );
}

// 父菜单：button（不导航）+ 悬浮展开子菜单。
function NavParent({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavChild[];
  pathname: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="w-40 overflow-hidden rounded-lg border bg-surface shadow-lg">
          {items.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`block px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground ${
                pathname === c.href ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// 前台头部：左 logo（牌角签名 + 字标）/ 中 导航 / 右 预设切换 + 明暗 + 登录/用户菜单。
export function Header() {
  const { authenticated } = useAuth();
  const { scheme, toggleScheme } = useTheme();
  const { user } = useUser();
  const pathname = usePathname();

  // 按authPaths 过滤：扁平项需自己的路由；父菜单需任一子菜单路由（子菜单各自过滤）。
  const allowed = authNavItems.flatMap((item) => {
    if (item.children) {
      const kids = item.children.filter((c) =>
        user?.authPaths?.includes(c.href),
      );
      return kids.length ? [{ ...item, children: kids }] : [];
    }
    return user?.authPaths?.includes(item.href) ? [item] : [];
  });

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-16 items-center px-6">
        {/* 左：logo--扑克牌角标（J + 红黑桃）+ 字标 */}
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="flex h-7 w-6 flex-col items-center justify-center rounded-[3px] border leading-none"
              aria-hidden="true"
            >
              <span className="font-display text-[10px] font-bold">J</span>
              <span className="text-[11px] leading-none text-brand">♠</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Joker Box
            </span>
          </Link>
        </div>

        {/* 中：导航（当前页标红发丝下划线；父菜单 hover 展开子菜单）*/}
        <nav className="flex items-center gap-6">
          <NavLink href="/" label="首页" active={pathname === "/"} />
          {allowed.map((item) =>
            item.children ? (
              <NavParent
                key={item.href}
                label={item.label}
                items={item.children}
                pathname={pathname}
              />
            ) : (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
              />
            ),
          )}
        </nav>

        {/* 右：预设切换 + 明暗 + 登录/用户菜单 */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <ThemeSelect />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleScheme}
            aria-label="切换深色模式"
            className="text-muted-foreground"
          >
            {scheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
          {authenticated ? (
            <UserMenu />
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/register">注册</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/login">登录</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
