"use client";

import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsiteGroups } from "@/hooks/useWebsiteGroups";

// 从 url 提取域名用于展示。
function domainOf(url: string): string {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

// 收藏网站：按分组展示，每站一张卡片，点击新标签打开。
export default function WebsitePage() {
  const { groups, loading } = useWebsiteGroups();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">收藏网站</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          常用站点聚合，按分组整理。
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-sm text-muted-foreground">
          <p>暂无收藏网站。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {(groups ?? []).map((group) => (
            <section key={group.groupName}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-brand" />
                <h2 className="font-display text-lg font-semibold">
                  {group.groupName}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {group.child.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.child.map((w) => (
                  <a
                    key={w.url}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-2 rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground transition-colors group-hover:text-brand">
                        {w.title}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    {w.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {w.description}
                      </p>
                    )}
                    <span className="mt-auto font-mono text-xs text-muted-foreground">
                      {domainOf(w.url)}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
