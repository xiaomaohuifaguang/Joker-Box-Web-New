"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import { getPostInfo, removePost } from "@/lib/api/ganDaShi";
import { ApiError } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichContent } from "./RichContent";
import { CommentSection } from "./CommentSection";
import type { GanDaShiPost } from "@/types";

// 帖子详情：标题/作者/时间/浏览 + content(prose) + 评论。删帖（作者或 admin）。
export function PostDetail({
  postId,
  onBack,
}: {
  postId: number;
  onBack: () => void;
}) {
  const [post, setPost] = useState<GanDaShiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  // postId 变化时回到加载态（render 期内条件 setState；effect 内不 sync setState）。
  const [prevPostId, setPrevPostId] = useState(postId);
  if (prevPostId !== postId) {
    setPrevPostId(postId);
    setLoading(true);
    setPost(null);
  }

  useEffect(() => {
    let cancelled = false;
    getPostInfo(postId)
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .catch(() => {
        if (!cancelled) toast.error("加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm("确认删除这篇帖子？")) return;
    try {
      await removePost(post.id);
      toast.success("已删除");
      onBack();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  const canDelete = !!(post && user && (post.createBy === user.userId || user.admin));

  return (
    <Container className="py-8 md:py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : post ? (
        <article>
          <header className="mb-6">
            <h1 className="font-display text-2xl font-semibold">{post.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {post.createByName || post.createUsername || "匿名"}
              </span>
              <span className="font-mono">{post.createTime}</span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {post.viewCount}
              </span>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7 text-destructive"
                  onClick={handleDelete}
                  aria-label="删帖"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </header>
          <RichContent html={post.content ?? ""} className="mb-8" />
          <CommentSection postId={String(post.id)} />
        </article>
      ) : (
        <p className="text-sm text-muted-foreground">帖子不存在或已删除。</p>
      )}
    </Container>
  );
}
