"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addComment, queryCommentPage, removeComment } from "@/lib/api/ganDaShi";
import { ApiError } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichContent } from "./RichContent";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";
import type { GanDaShiComment } from "@/types";

// 单条根评论 + 其下子评论（展开加载）+ 回复表单。
// 回复逻辑：parentId 始终为根评论 id；replayId 为被回复的子评论 id（回复根时为空）。
// 删评论：评论无 createBy，前端仅 admin 显示删除按钮（后端再限制）。
export function CommentThread({
  comment: root,
  postId,
  onChanged,
}: {
  comment: GanDaShiComment;
  postId: string;
  onChanged: () => void;
}) {
  const { user } = useUser();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<GanDaShiComment[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replayTarget, setReplayTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);

  // 核心拉取：setState 仅在 .then/.finally 回调内（不 sync setLoading）。
  const fetchReplies = useCallback(() => {
    let cancelled = false;
    queryCommentPage({
      postId,
      parentId: String(root.id),
      current: 1,
      size: 100,
    })
      .then((p) => {
        if (!cancelled) setReplies(p?.records ?? []);
      })
      .catch(() => {
        if (!cancelled) setReplies([]);
      })
      .finally(() => {
        if (!cancelled) setRepliesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, root.id]);

  // expanded 变化时回到加载态（render 期内条件 setState；effect 内不 sync setState）。
  const [prevExpanded, setPrevExpanded] = useState(expanded);
  if (prevExpanded !== expanded) {
    setPrevExpanded(expanded);
    if (expanded) setRepliesLoading(true);
  }

  useEffect(() => {
    if (!expanded) return;
    return fetchReplies();
  }, [expanded, fetchReplies]);

  function refreshReplies() {
    // 事件式调用：sync setLoading 在非 effect 上下文允许。
    setRepliesLoading(true);
    return fetchReplies();
  }

  function openReplyToRoot() {
    setReplayTarget(null);
    setReplyOpen(true);
  }
  function openReplyToReply(r: GanDaShiComment) {
    setReplayTarget({ id: String(r.id), name: r.createByName || "匿名" });
    setReplyOpen(true);
  }

  async function submitReply() {
    const html = editorRef.current?.getHTML() ?? "";
    const text = editorRef.current?.getText() ?? "";
    if (!text.trim()) {
      toast.error("请输入回复");
      return;
    }
    setBusy(true);
    try {
      await addComment({
        postId,
        parentId: String(root.id),
        replayId: replayTarget?.id ?? "",
        comment: html,
      });
      toast.success("已回复");
      editorRef.current?.clear();
      setReplyOpen(false);
      setReplayTarget(null);
      setExpanded(true);
      refreshReplies();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "回复失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("确认删除这条评论？")) return;
    try {
      await removeComment(id);
      toast.success("已删除");
      if (expanded) refreshReplies();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  const canDelete = !!user?.admin;

  return (
    <div className="flex flex-col gap-2">
      {/* 根评论 */}
      <div className="rounded-lg border p-3">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {root.createByName || "匿名"}
          </span>
          <span className="font-mono">{root.createTime}</span>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6 text-destructive"
              onClick={() => handleDelete(root.id)}
              aria-label="删除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <RichContent html={root.comment} className="prose-sm" />
        <div className="mt-2 flex items-center gap-4 text-xs">
          <button
            type="button"
            onClick={openReplyToRoot}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            回复
          </button>
          {root.replayCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? "收起回复" : `查看 ${root.replayCount} 条回复`}
            </button>
          )}
        </div>
      </div>

      {/* 子评论 */}
      {expanded && (
        <div className="ml-6 flex flex-col gap-2 border-l pl-4">
          {repliesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            replies.map((r) => (
              <div key={r.id} className="rounded-md p-2">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {r.createByName || "匿名"}
                  </span>
                  {r.replayName && <span>回复 @{r.replayName}</span>}
                  <span className="font-mono">{r.createTime}</span>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6 text-destructive"
                      onClick={() => handleDelete(r.id)}
                      aria-label="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <RichContent html={r.comment} className="prose-sm" />
                <button
                  type="button"
                  onClick={() => openReplyToReply(r)}
                  className="mt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  回复
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 回复表单 */}
      {replyOpen && (
        <div className="ml-6 flex flex-col gap-2">
          {replayTarget && (
            <span className="text-xs text-muted-foreground">
              回复 @{replayTarget.name}
            </span>
          )}
          <RichTextEditor ref={editorRef} compact placeholder="写回复..." />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReplyOpen(false);
                setReplayTarget(null);
              }}
            >
              取消
            </Button>
            <Button size="sm" onClick={submitReply} disabled={busy}>
              {busy ? "发布中…" : "回复"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
