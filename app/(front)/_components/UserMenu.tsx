"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, LayoutDashboard, LogOut, Mail, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 用户头像 + 下拉菜单：身份卡头（头像+名称+徽章）/ 信息行（角色·机构·邮箱）/ 操作项。
// 用 shadcn dropdown-menu（点击触发、键盘可达、escape 关闭）。
export function UserMenu() {
  const { logout } = useAuth();
  const { user } = useUser();

  const initials = (user?.nickname || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="用户菜单"
        >
          <UserAvatar
            userId={user?.userId}
            initials={initials}
            className="h-9 w-9"
            fallbackClassName="bg-felt font-display text-sm text-background"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        {/* 身份卡头：大头像 + 名称 + 管理员徽章 + 用户名 */}
        <div className="flex items-center gap-3 px-3 py-3">
          <UserAvatar
            userId={user?.userId}
            initials={initials}
            className="h-11 w-11"
            fallbackClassName="bg-felt font-display text-base text-background"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-sm font-semibold leading-none">
                {name}
              </span>
              {user?.admin && (
                <Badge className="h-4 px-1 text-[10px]">管理员</Badge>
              )}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              @{user?.username ?? "-"}
            </span>
          </div>
        </div>

        {/* 信息行：角色 / 机构 / 邮箱（icon + 内容，紧凑无小标题） */}
        {(user?.roles?.length || user?.orgs?.length || user?.mail) && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="flex flex-col gap-2 px-3 py-2.5 text-xs">
              {user?.roles?.length ? (
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <Badge
                        key={r.name}
                        variant="outline"
                        className="h-4 px-1 text-[10px] font-normal text-muted-foreground"
                      >
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {user?.orgs?.length ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {user.orgs.map((o) => o.name).join("、")}
                  </span>
                </div>
              ) : null}
              {user?.mail ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono">{user.mail}</span>
                </div>
              ) : null}
            </div>
          </>
        )}

        <DropdownMenuSeparator className="m-0" />
        <div className="p-1">
          {user?.admin ? (
            <DropdownMenuItem asChild>
              <Link href="/console">
                <LayoutDashboard className="h-4 w-4" />
                后台管理
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault(); // 保持下拉打开，避免 AlertDialog 触发焦点冲突
              setConfirmLogout(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* 退出登录二次确认：防止向上展开的下拉误触直接退出 */}
    <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
          <AlertDialogDescription>
            退出后需要重新登录才能继续使用受限功能。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={logout}>退出登录</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
