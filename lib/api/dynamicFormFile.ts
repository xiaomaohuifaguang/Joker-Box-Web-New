import { ApiError, buildQuery, handleUnauthorized } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { FileInfo } from "@/types";

const BASE_URL = "/joker-box";
const SUCCESS_CODE = 200;

// 动态表单文件接口（/file/*DynamicForm）。与码头云盘的 /file/upload|download 分开，
// 走独立的动态表单目录。上传走 multipart（自定义 fetch，不用 api.post 的 JSON）；下载走 POST blob。

// 上传：POST /file/uploadDynamicForm，multipart（uploadFile）。响应 data = FileInfo。
export async function uploadDynamicFormFile(file: File): Promise<FileInfo> {
  const fd = new FormData();
  fd.append("uploadFile", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/file/uploadDynamicForm`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new ApiError(res.status, `上传失败: ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body) throw new ApiError(res.status, "上传失败：响应异常");
  handleUnauthorized(body.code, !!token);
  if (body.code !== SUCCESS_CODE)
    throw new ApiError(body.code, body.msg || `上传失败: ${body.code}`);
  return body.data as FileInfo;
}

// 下载：GET /file/downloadDynamicForm?fileId=，返回 blob 并触发浏览器下载。
export async function downloadDynamicFormFile(
  fileId: string,
  filename: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = BASE_URL + "/file/downloadDynamicForm" + buildQuery({ fileId });
  const res = await fetch(url, { headers });
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || contentType.includes("application/json")) {
    let msg = `下载失败: ${res.status}`;
    try {
      const body = await res.json();
      msg = body.msg || msg;
      handleUnauthorized(body.code ?? res.status, !!token);
    } catch {
      handleUnauthorized(res.status, !!token);
    }
    throw new ApiError(res.status, msg);
  }
  const blob = await res.blob();
  const url2 = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url2;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url2);
}
