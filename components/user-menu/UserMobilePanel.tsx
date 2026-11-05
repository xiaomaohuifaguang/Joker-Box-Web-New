"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { UserIdentity } from "./UserIdentity";

const rowClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent";

// 移动菜单底部的用户区：与桌面用户菜单同样的身份信息和入口，退出同样需要确认。
export function UserMobilePanel({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useUserDisplay();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="flex flex-col">
      <UserIdentity />
      <div className="flex flex-col border-t p-1">
        {user?.admin ? (
          <Link href="/console" onClick={onNavigate} className={rowClass}>
            <LayoutDashboard className="h-4 w-4" />
            后台管理
          </Link>
        ) : null}
        <Link href="/settings" onClick={onNavigate} className={rowClass}>
          <Settings className="h-4 w-4" />
          个人设置
        </Link>
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className={`${rowClass} text-destructive`}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
      <LogoutConfirmDialog open={confirmLogout} onOpenChange={setConfirmLogout} />
    </div>
  );
}
