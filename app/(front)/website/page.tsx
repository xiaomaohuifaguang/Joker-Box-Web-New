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

  // scroll-spy：分组进入视口顶部条带时高亮。用 IntersectionObserver 而非 window scroll——
  // 前台可切侧栏布局后滚动容器是 inset 内部 div，window scroll 不触发；IO root=null 会
  // 自动处理祖先 overflow 裁剪，顶栏/侧栏两种布局都对。
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const sections = groups
      .map((_, i) => document.getElementById(`group-${i}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // 条带内可能同时有两个分组（切换瞬间）：取文档序最靠上的
        const first = sections.find((s) => visible.has(s.id));
        if (first) {
          const i = Number(first.id.replace("group-", ""));
          setActive(groups[i].groupName);
        }
      },
      // 顶部 80px = sticky chrome（--front-chrome-h）+ 缓冲；底部压掉 70% 屏，
      // 只留顶部一条带 -> 条带内的分组即「当前」
      { rootMargin: "-80px 0px -70% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
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
          <aside className="md:sticky md:top-[calc(var(--front-chrome-h,4rem)+0.5rem)] md:w-48 md:shrink-0 md:self-start">
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
          <main className="flex min-w-0 flex-1 flex-col gap-8 pb-[calc(100svh-5rem)]">
            {(groups ?? []).map((g, i) => (
              <section key={g.groupName} id={`group-${i}`} className="scroll-mt-[calc(var(--front-chrome-h,4rem)+1rem)]">
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
