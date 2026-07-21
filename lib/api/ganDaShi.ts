import { api } from "@/lib/api";
import type {
  GanDaShiComment,
  GanDaShiCommentPageParam,
  GanDaShiPost,
  GanDaShiPostPageParam,
  Page,
} from "@/types";

// 干大事论坛接口：帖子（/ganDaShiPost/*）+ 评论（/ganDaShiComment/*）。
// 帖子 id 走 body（info/remove）；评论 postId/parentId/replayId 是 string。

// ---- 帖子 ----

// 帖子分页：POST /ganDaShiPost/queryPage，body 传参。
export async function queryPostPage(
  params: GanDaShiPostPageParam,
): Promise<Page<GanDaShiPost>> {
  const { data } = await api.post<Page<GanDaShiPost>>(
    "/ganDaShiPost/queryPage",
    { body: params },
  );
  return data;
}

// 帖子详情：POST /ganDaShiPost/info，body { id }。返回含 content(HTML) + text。
export async function getPostInfo(id: number): Promise<GanDaShiPost> {
  const { data } = await api.post<GanDaShiPost>("/ganDaShiPost/info", {
    body: { id },
  });
  return data;
}

// 发帖：POST /ganDaShiPost/add，body { title, content(HTML), text(纯文字) }。
export async function addPost(post: {
  title: string;
  content: string;
  text: string;
}): Promise<void> {
  await api.post<unknown>("/ganDaShiPost/add", { body: post });
}

// 删帖：POST /ganDaShiPost/remove，body { id }。
export async function removePost(id: number): Promise<void> {
  await api.post<unknown>("/ganDaShiPost/remove", { body: { id } });
}

// ---- 评论 ----

// 评论分页：POST /ganDaShiComment/queryPage，body 传参。
// parentId 为空查帖子根评论；非空查该评论的子评论。
export async function queryCommentPage(
  params: GanDaShiCommentPageParam,
): Promise<Page<GanDaShiComment>> {
  const { data } = await api.post<Page<GanDaShiComment>>(
    "/ganDaShiComment/queryPage",
    { body: params },
  );
  return data;
}

// 发评论：POST /ganDaShiComment/add，body { postId, parentId, replayId, comment(HTML) }。
export async function addComment(comment: {
  postId: string;
  parentId: string;
  replayId: string;
  comment: string;
}): Promise<void> {
  await api.post<unknown>("/ganDaShiComment/add", { body: comment });
}

// 删评论：POST /ganDaShiComment/remove，body { id }。
export async function removeComment(id: number): Promise<void> {
  await api.post<unknown>("/ganDaShiComment/remove", { body: { id } });
}
