import { api, ApiError, buildQuery, handleUnauthorized } from "@/lib/api";
import { apiFetch, saveBlob } from "@/lib/api/fetch";
import { env } from "@/lib/env";
import { getToken } from "@/lib/auth";
import type { SampleCode } from "@/types";

// 代码工厂（/rapidDevelopment/*）：按数据库表名生成前后端示例代码。

const BASE_URL = env.apiBase;

// 生成：POST /rapidDevelopment/generate，**query 传参** tableName（非 body，对齐后端）。
export async function generateSampleCode(
  tableName: string,
): Promise<SampleCode> {
  const { data } = await api.post<SampleCode>("/rapidDevelopment/generate", {
    params: { tableName },
  });
  return data;
}

// 下载压缩包：POST /rapidDevelopment/downloadZip?tableName=，响应是文件下载流。
// blob 场景不走 api.*，同 file.ts 的 download：apiFetch + token + 错误时按 JSON 解析。
export async function downloadSampleCodeZip(tableName: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url =
    BASE_URL + "/rapidDevelopment/downloadZip" + buildQuery({ tableName });
  const res = await apiFetch(url, { method: "POST", headers });
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
  await saveBlob(blob, `${tableName}.zip`);
}
