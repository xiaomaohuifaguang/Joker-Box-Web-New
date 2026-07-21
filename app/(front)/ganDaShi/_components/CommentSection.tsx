"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { addComment } from "@/lib/api/ganDaShi";
import { ApiError } from "@/lib/api";
import { useComments } from "@/hooks/useComments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";
import { CommentThread } from "./CommentThread";

// 评论区：根评论分页 + 根评论表单 + 各根评论的回复线程。
export function CommentSection({ postId }: { postId: string }) {
  const [current, setCurrent] = useState(1);
  const [size] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const { page, loading } = useComments({
    postId,
    parentId: "",
    current,
    size,
    refreshKey,
  });
  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));

  async function submitComment() {
    const html = editorRef.current?.getHTML() ?? "";
    const text = editorRef.current?.getText() ?? "";
    if (!text.trim()) {
      toast.error("请输入评论");
      return;
    }
    setBusy(true);
    try {
      await addComment({ postId, parentId: "", replayId: "", comment: html });
      toast.success("已评论");
      editorRef.current?.clear();
      setRefreshKey((k) => k + 1);
      setCurrent(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "评论失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t pt-6">
      <h2 className="font-display mb-4 text-lg font-semibold">
        评论（{total}）
      </h2>

      {/* 根评论表单 */}
      <div className="mb-6 flex flex-col gap-2">
        <RichTextEditor ref={editorRef} compact placeholder="写评论..." />
        <div className="flex justify-end">
          <Button onClick={submitComment} disabled={busy} size="sm">
            {busy ? "发布中…" : "评论"}
          </Button>
        </div>
      </div>

      {/* 根评论 */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          暂无评论，来抢沙发。
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {records.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              postId={postId}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            disabled={current <= 1}
            onClick={() => setCurrent((c) => c - 1)}
          >
            上一页
          </Button>
          <span>
            {current} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= totalPages}
            onClick={() => setCurrent((c) => c + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </section>
  );
}
