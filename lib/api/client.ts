import { clearToken, getToken } from "@/lib/auth";
import type { ApiResponse } from "@/types";

/** 业务成功码（按后端约定调整，常见为 200 或 0）。 */
const SUCCESS_CODE = 200;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// 接口根路径：开发由 next.config.ts rewrites 代理，生产由 nginx 反代。
const BASE_URL = "/joker-box";

// 401 处理：请求时携带了 token 且响应 code=401 -> token 无效/过期，清空登录信息。
// clearToken 同步清 token；动态 import clearUser 清用户（避免循环依赖）。
export function handleUnauthorized(code: number, hadToken: boolean): void {
  if (code === 401 && hadToken) {
    clearToken();
    void import("@/lib/user").then(({ clearUser }) => clearUser());
  }
}

// 对象 -> ?key=value&key2=value2（自动 encodeURIComponent，跳过 null/undefined）。
export function buildQuery(
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return "";
  return (
    "?" +
    entries
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&")
  );
}

// 请求选项：body -> JSON.stringify；params -> buildQuery 拼到 URL。
type RequestOptions = {
  method: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

async function request<T>(
  path: string,
  opts: RequestOptions,
): Promise<ApiResponse<T>> {
  const url = BASE_URL + path + buildQuery(opts.params);
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    handleUnauthorized(res.status, !!token);
    throw new ApiError(res.status, `请求失败: ${res.status}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.code !== SUCCESS_CODE) {
    handleUnauthorized(body.code, !!token);
    throw new ApiError(body.code, body.msg || `请求失败: ${body.code}`);
  }
  return body;
}

// 公开 API：get/delete 只有 query（params）；post/put 可有 body 和/或 params。
export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ) => request<T>(path, { method: "GET", params }),

  post: <T>(
    path: string,
    opts?: {
      body?: unknown;
      params?: Record<string, string | number | undefined>;
    },
  ) =>
    request<T>(path, {
      method: "POST",
      body: opts?.body,
      params: opts?.params,
    }),

  put: <T>(
    path: string,
    opts?: {
      body?: unknown;
      params?: Record<string, string | number | undefined>;
    },
  ) =>
    request<T>(path, {
      method: "PUT",
      body: opts?.body,
      params: opts?.params,
    }),

  delete: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ) => request<T>(path, { method: "DELETE", params }),
};
