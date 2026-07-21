"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsiteGroups } from "@/hooks/useWebsiteGroups";
import { cn } from "@/lib/utils";

// 从 url 提取域名用于展示。
function domainOf(url: string): string {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

// 收藏网站：左粘性分组导航（点跳转 + scroll-spy 高亮）+ 右分组内容。
export default function WebsitePage() {
  const { groups, loading } = useWebsiteGroups();
  const [active, setActive] = useState<string | null>(null);

  // scroll-spy：当前顶部可见的分组高亮。OFFSET = 前台 Header(h-16=64) + 缓冲。
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const OFFSET = 80;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let current: string | null = null;
        for (let i = 0; i < groups.length; i++) {
          const el = document.getElementById(`group-${i}`);
          if (el && el.getBoundingClientRect().top <= OFFSET)
            current = groups[i].groupName;
        }
        setActive(current ?? groups[0].groupName);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [groups]);

  function jumpTo(i: number) {
    const el = document.getElementById(`group-${i}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6">
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
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* 分组导航：桌面粘性竖列，移动横向 chip 行 */}
          <aside className="md:sticky md:top-16 md:w-48 md:shrink-0 md:self-start">
            <nav className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-x-visible md:pb-0">
              {(groups ?? []).map((g, i) => (
                <button
                  key={g.groupName}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors md:w-full",
                    active === g.groupName
                      ? "bg-brand text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate">{g.groupName}</span>
                  <span className="font-mono text-xs opacity-70">
                    {g.child.length}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* 分组内容 */}
          <main className="flex min-w-0 flex-1 flex-col gap-8 pb-[calc(100vh-5rem)]">
            {(groups ?? []).map((g, i) => (
              <section key={g.groupName} id={`group-${i}`} className="scroll-mt-20">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-brand" />
                  <h2 className="font-display text-lg font-semibold">
                    {g.groupName}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {g.child.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.child.map((w) => (
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
          </main>
        </div>
      )}
    </Container>
  );
}
