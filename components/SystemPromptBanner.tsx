"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { listActiveSysPrompts } from "@/lib/api/systemPrompt";
import {
  ANON_OWNER,
  getReadIds,
  markRead,
  pruneReadIds,
} from "@/lib/systemPromptRead";
import { useUser } from "@/hooks/useUser";
import type { SystemPrompt } from "@/types";

// 全局公告横幅：挂载时拉生效中的系统提示（白名单接口），过滤当前身份已读的后垂直堆叠展示，
// 每条独立可关——点 X = markRead（已登录记 userId 名下、未登录记 anon）+ 从视图移除。
// 挂在 (front)/layout.tsx Header 下方；无公告时不渲染。登录后 anon 已读由 UserBootstrap 合并进账号。
export function SystemPromptBanner() {
  const { user } = useUser();
  const owner = user?.userId ?? ANON_OWNER;

  // all = 接口返回的活跃公告（null=未加载完）；dismissed = 本次会话内已点 X 的 id
  // （不等 localStorage 快照重算，即时从视图移除；owner 切换（登录）时也不回弹）。
  const [all, setAll] = useState<SystemPrompt[] | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    listActiveSysPrompts()
      .then((list) => {
        if (cancelled) return;
        // 清掉已不在活跃列表里的已读 id（过期/被删的公告），防止 localStorage 越存越多。
        pruneReadIds(list.map((p) => p.id));
        setAll(list);
      })
      .catch(() => {
        // 拉取失败静默：不显示横幅即可，不打断页面。
        if (!cancelled) setAll([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const read = getReadIds(owner);
  const visible = (all ?? []).filter(
    (p) => !read.includes(p.id) && !dismissed.includes(p.id),
  );

  function dismiss(id: number) {
    markRead(owner, id);
    setDismissed((d) => [...d, id]);
  }

  if (visible.length === 0) return null;

  return (
    <div
      className="border-b"
      style={{
        borderColor: "color-mix(in oklab, var(--brand) 30%, transparent)",
        background: "color-mix(in oklab, var(--brand) 8%, transparent)",
      }}
    >
      <div className="mx-auto w-[85%] max-w-[1600px]">
        {visible.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-3 border-b py-2.5 last:border-b-0"
            style={{
              borderColor: "color-mix(in oklab, var(--brand) 20%, transparent)",
            }}
          >
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="flex-1 text-sm break-words whitespace-pre-wrap">
              {p.prompt}
            </p>
            <button
              type="button"
              onClick={() => dismiss(p.id)}
              aria-label="关闭公告"
              className="mt-0.5 shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
