"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { UserMenuDropdown } from "@/components/user-menu/UserMenuDropdown";
import { useUserDisplay } from "@/hooks/useUserDisplay";

// 前台顶栏的用户头像入口。
export function UserMenu() {
  const { user, initials } = useUserDisplay();
  return (
    <UserMenuDropdown context="front">
      <button
        type="button"
        className="rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="用户菜单"
      >
        <UserAvatar
          userId={user?.userId}
          initials={initials}
          className="h-9 w-9"
          fallbackClassName="bg-brand-2 text-sm text-background"
        />
      </button>
    </UserMenuDropdown>
  );
}
