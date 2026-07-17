"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 用户头像 + 下拉菜单：详细信息 / 后台管理[仅 admin] / 退出登录。
// 用 shadcn dropdown-menu（点击触发、键盘可达、escape 关闭）。
export function UserMenu() {
  const { logout } = useAuth();
  const { user } = useUser();

  const initials = (user?.nickname || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="用户菜单"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-felt font-display text-sm text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold leading-none">
                {name}
              </span>
              {user?.admin && <Badge>管理员</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">
              @{user?.username ?? "-"}
            </span>
          </div>
        </DropdownMenuLabel>

        {(user?.roles?.length || user?.orgs?.length || user?.mail) && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              {user?.roles?.length ? (
                <div className="mb-2">
                  <div className="text-[11px] text-muted-foreground">角色</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <Badge
                        key={r.name}
                        variant="outline"
                        className="font-normal text-muted-foreground"
                      >
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {user?.orgs?.length ? (
                <div className="mb-2">
                  <div className="text-[11px] text-muted-foreground">机构</div>
                  <div className="mt-0.5 text-sm">
                    {user.orgs.map((o) => o.name).join("、")}
                  </div>
                </div>
              ) : null}
              {user?.mail ? (
                <div>
                  <div className="text-[11px] text-muted-foreground">邮箱</div>
                  <div className="mt-0.5 truncate font-mono text-xs">
                    {user.mail}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        {user?.admin ? (
          <DropdownMenuItem asChild>
            <Link href="/console">后台管理</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={logout}
          className="text-destructive focus:text-destructive"
        >
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
