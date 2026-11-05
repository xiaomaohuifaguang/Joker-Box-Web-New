"use client";

import { Building2, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { useUserDisplay } from "@/hooks/useUserDisplay";

// 用户身份卡：头像 + 名称 + 管理员徽章 + 用户名 / 角色、机构、邮箱。
export function UserIdentity() {
  const { user, name, initials } = useUserDisplay();
  const hasDetails = !!(user?.roles?.length || user?.orgs?.length || user?.mail);

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-3">
        <UserAvatar
          userId={user?.userId}
          initials={initials}
          className="h-11 w-11"
          fallbackClassName="bg-brand-2 text-base text-background"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{name}</span>
            {user?.admin && <Badge className="shrink-0 px-1.5 py-0">管理员</Badge>}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            @{user?.username ?? "-"}
          </span>
        </div>
      </div>

      {hasDetails && (
        <div className="flex flex-col gap-2 border-t px-3 py-2.5 text-xs">
          {user?.roles?.length ? (
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {user.roles.map((r) => (
                  <Badge
                    key={r.name}
                    variant="outline"
                    className="px-1.5 py-0 font-normal text-muted-foreground"
                  >
                    {r.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {user?.orgs?.length ? (
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {/* 机构可能多且名称长：换行全显，高度封顶可滚动；超长名 title 悬停见全名 */}
              <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                {user.orgs.map((o) => (
                  <Badge
                    key={o.name}
                    variant="outline"
                    title={o.name}
                    className="max-w-full px-1.5 py-0 font-normal text-muted-foreground"
                  >
                    <span className="min-w-0 truncate">{o.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {user?.mail ? (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{user.mail}</span>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
