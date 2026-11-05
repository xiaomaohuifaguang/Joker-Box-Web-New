"use client";

import { useEffect, useState } from "react";
import { Eye, Plus, RotateCcw, Search } from "lucide-react";
import { usePostPage } from "@/hooks/usePostPage";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPagination } from "@/components/DataPagination";

// 帖子列表：搜索 + 分页 + 帖子卡（标题/digest/作者/时间/浏览）。点击进详情。
export function PostList({
  onOpen,
  onNew,
}: {
  onOpen: (id: number) => void;
  onNew: () => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = usePostPage({ search, current, size, refreshKey });
  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6 flex items-center gap-4">
        <h1 className="text-page-title font-semibold">干大事</h1>
        <p className="text-sm text-muted-foreground">在这里聊点大的。</p>
        <Button onClick={onNew} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          发帖
        </Button>
      </header>

      {/* 搜索 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索标题/摘要"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput("");
            setSearch("");
            setCurrent(1);
            setRefreshKey((k) => k + 1);
          }}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </Button>
      </div>

      {/* 帖子列表 */}
      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-24 text-center text-sm text-muted-foreground">
            <p>还没有帖子，来发第一篇。</p>
            <Button onClick={onNew} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              发帖
            </Button>
          </div>
        ) : (
          records.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => onOpen(post.id)}
              className="group flex flex-col gap-2 rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
            >
              <h2 className="font-display text-lg font-semibold transition-colors group-hover:text-brand">
                {post.title}
              </h2>
              {post.digest && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {post.digest}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {post.createByName || post.createUsername || "匿名"}
                </span>
                <span className="tabular-nums">{post.createTime}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {post.viewCount}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 分页 */}
      {records.length > 0 && (
        <DataPagination
          current={current}
          size={size}
          total={total}
          onCurrentChange={setCurrent}
          onSizeChange={(s) => {
            setSize(s);
            setCurrent(1);
          }}
          className="mt-6"
        />
      )}
    </Container>
  );
}
