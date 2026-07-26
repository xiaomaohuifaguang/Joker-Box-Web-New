"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/api/avatar";

// 共享用户头像：前台 UserMenu / 后台 ConsoleSidebar 都用。
// 有 userId 时异步拉 /auth/avatar/{userId}（图片流）→ AvatarImage；
// 任何失败（无 userId / 接口报错 / 空流）都保持 AvatarFallback 昵称取字。
// 样式（尺寸/圆角）由调用方传 className，前后台各自定。
export function UserAvatar({
  userId,
  initials,
  className,
  fallbackClassName,
}: {
  userId?: string;
  initials: string;
  className?: string;
  fallbackClassName?: string;
}) {
  // userId 变化时回到取字态（render 期条件 setState；effect 内只在异步回调 setState）
  const [prevId, setPrevId] = useState(userId);
  const [src, setSrc] = useState<string | null>(null);
  if (prevId !== userId) {
    setPrevId(userId);
    setSrc(null);
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    getAvatarUrl(userId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        // 拉取失败：保持取字 fallback，不做任何事
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId]);

  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
