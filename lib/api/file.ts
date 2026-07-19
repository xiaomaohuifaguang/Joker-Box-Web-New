import { api, ApiError, handleUnauthorized } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { FileItem } from "@/types";

const BASE_URL = "/joker-box";
const SUCCESS_CODE = 200;

// 文件列表：POST /file/list?parentId=<id>（"0" 查根目录）。parentId 为 query 参数。
export async function listFiles(parentId: string): Promise<FileItem[]> {
  const { data } = await api.post<FileItem[]>(
    `/file/list?parentId=${encodeURIComponent(parentId)}`,
  );
  return data;
}

// 上传文件：POST /file/upload，multipart（uploadFile + parentId）。
// 不用 api.post（它会设 Content-Type: application/json，破坏 multipart boundary）。
export async function uploadFile(file: File, parentId: string): Promise<void> {
  const fd = new FormData();
  fd.append("uploadFile", file);
  fd.append("parentId", parentId);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/file/upload`, {
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
}

// 创建文件夹：POST /file/createFolder?parentId=<id>&fileName=<name>。
export async function createFolder(
  parentId: string,
  fileName: string,
): Promise<void> {
  await api.post<unknown>(
    `/file/createFolder?parentId=${encodeURIComponent(parentId)}&fileName=${encodeURIComponent(fileName)}`,
  );
}

// 删除：POST /file/delete?fileId=<id>。
export async function deleteFile(fileId: string): Promise<void> {
  await api.post<unknown>(`/file/delete?fileId=${encodeURIComponent(fileId)}`);
}

// 重命名：POST /file/rename?fileId=<id>&filename=<name>。
export async function renameFile(
  fileId: string,
  filename: string,
): Promise<void> {
  await api.post<unknown>(
    `/file/rename?fileId=${encodeURIComponent(fileId)}&filename=${encodeURIComponent(filename)}`,
  );
}

// 下载：GET /file/download?fileId=，带 token；返回 blob 并触发浏览器下载。
export async function downloadFile(
  fileId: string,
  filename: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(
    `${BASE_URL}/file/download?fileId=${encodeURIComponent(fileId)}`,
    { headers },
  );
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || contentType.includes("application/json")) {
    // 错误响应（JSON）
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
