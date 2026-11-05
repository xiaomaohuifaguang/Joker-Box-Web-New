"use client";

import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { Home, LayoutDashboard, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { UserIdentity } from "./UserIdentity";

// 用户菜单下拉：前台顶栏、前台侧栏、后台侧栏共用。
// context=front 显示「后台管理」（仅管理员），context=console 显示「返回前台」。
export function UserMenuDropdown({
  context,
  side,
  align = "end",
  children,
}: {
  context: "front" | "console";
  side?: ComponentProps<typeof DropdownMenuContent>["side"];
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
  /** 触发器（单个可接收 ref 的元素） */
  children: ReactNode;
}) {
  const { user } = useUserDisplay();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // 防误触：Radix 菜单 pointerdown 即开，且 MenuItem 会把「没有对应 pointerdown 的 pointerup」
  // 合成 click。开菜单那次点击的抬起若落在菜单项上（如贴边的退出登录）会被误触发，
  // 这里拦掉内容内未先按下的第一次抬起；正常点击不受影响。
  const downInsideRef = useRef(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          onPointerDownCapture={() => {
            downInsideRef.current = false;
          }}
        >
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={side}
          align={align}
          className="w-72 p-0"
          onPointerDownCapture={() => {
            downInsideRef.current = true;
          }}
          onPointerUpCapture={(e) => {
            if (!downInsideRef.current) e.stopPropagation();
          }}
        >
          <UserIdentity />
          <div className="border-t p-1">
            {context === "console" ? (
              <DropdownMenuItem asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  返回前台
                </Link>
              </DropdownMenuItem>
            ) : user?.admin ? (
              <DropdownMenuItem asChild>
                <Link href="/console">
                  <LayoutDashboard className="h-4 w-4" />
                  后台管理
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                个人设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault(); // 保持下拉打开，避免 AlertDialog 焦点冲突
                setConfirmLogout(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 text-destructive" />
              退出登录
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <LogoutConfirmDialog open={confirmLogout} onOpenChange={setConfirmLogout} />
    </>
  );
}
