import { ApiError, handleUnauthorized } from "@/lib/api";
import { apiFetch } from "@/lib/api/fetch";
import { getToken } from "@/lib/auth";
import { env } from "@/lib/env";

const BASE_URL = env.apiBase;
const SUCCESS_CODE = 200;

// 头像变更事件：上传成功后广播，所有 UserAvatar 实例订阅重拉（仿 lib/user.ts 的 user_change 惯例）。
const AVATAR_EVENT = "avatar_change";

export function notifyAvatarChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AVATAR_EVENT));
}

export function onAvatarChange(cb: () => void): () => void {
  window.addEventListener(AVATAR_EVENT, cb);
  return () => window.removeEventListener(AVATAR_EVENT, cb);
}

// 用户头像：GET /auth/avatar/{userId}（path 参数），响应是图片文件流。
// blob 场景不走 api.post（照 downloadDynamicFormFile 的 fetch 模式），但不触发浏览器下载，
// 而是返回 URL.createObjectURL(blob) 供 <img>/AvatarImage 使用。
// 任何失败（非 2xx / 错误 JSON 体）都 throw —— 调用方捕获后退回昵称取字。
export async function getAvatarUrl(userId: string): Promise<string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await apiFetch(`${BASE_URL}/auth/avatar/${userId}`, { headers });
  const contentType = res.headers.get("content-type") ?? "";
  // 非 2xx，或返回的是 JSON（错误体而非图片流）→ 视为失败
  if (!res.ok || contentType.includes("application/json")) {
    throw new Error(`avatar: ${res.status}`);
  }
  const blob = await res.blob();
  if (blob.size === 0) throw new Error("avatar: empty");
  return URL.createObjectURL(blob);
}

// 上传头像：POST /auth/avatarUpload，multipart（part 名 uploadFile）。
// 不用 api.post（它会设 Content-Type: application/json，破坏 multipart boundary）——模板同 file.ts uploadFile。
// 成功后广播 avatar_change，调用方无需再手动通知。
export async function uploadAvatar(file: File): Promise<void> {
  const fd = new FormData();
  fd.append("uploadFile", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await apiFetch(`${BASE_URL}/auth/avatarUpload`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new ApiError(res.status, `上传失败: ${res.status}`);
  try {
    const body = await res.json();
    handleUnauthorized(body.code, !!token);
    if (body.code !== SUCCESS_CODE)
      throw new ApiError(body.code, body.msg || `上传失败: ${body.code}`);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // 非 JSON 响应，按成功处理
  }
  notifyAvatarChanged();
}
