import { apiFetch } from "@/lib/api/fetch";
import { getToken } from "@/lib/auth";
import { env } from "@/lib/env";

const BASE_URL = env.apiBase;

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
