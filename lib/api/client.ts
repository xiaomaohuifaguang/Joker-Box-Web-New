// 后端 API 客户端：所有后端调用统一走这里，组件不直接用 fetch。
// 接口根路径 /joker-box：
// - 开发：next.config.ts 的 rewrites 把 /joker-box/* 代理到后端（同源、无 CORS）。
// - 生产：nginx 把 /joker-box/* 反代到后端（静态导出无 Next 服务器，rewrites 不生效）。
// 在客户端组件中调用（静态导出下运行时取数只能在客户端）。
//
// 后端统一响应格式：{ code, data, msg, timestamp }（见 types/api.ts）。
// 成功（code === SUCCESS_CODE）时返回整个 body（ApiResponse<T>）；
// code !== SUCCESS_CODE 抛 ApiError(code, msg)。调用方解构 .data 取数据。
// 已登录时自动带 Authorization: Bearer <token>（见 lib/auth.ts）。

import { getToken } from "@/lib/auth";
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

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    throw new ApiError(res.status, `请求失败: ${res.status}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.code !== SUCCESS_CODE) {
    throw new ApiError(body.code, body.msg || `请求失败: ${body.code}`);
  }
  return body;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
