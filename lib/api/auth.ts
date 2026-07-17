import { api } from "@/lib/api";
import type { User } from "@/types";

export type Sex = "男" | "女" | "未知";

// 登录：POST /auth/getToken，返回 token 字符串（data 直接是 token）。
export async function login(username: string, password: string): Promise<string> {
  const { data } = await api.post<string>("/auth/getToken", {
    username,
    password,
  });
  return data;
}

// 获取当前登录用户信息：POST /auth/userInfo，返回 data（User）。
export async function getUserInfo(): Promise<User> {
  const { data } = await api.post<User>("/auth/userInfo");
  return data;
}

// 注册：POST /auth/register。
export async function register(body: {
  username: string;
  password: string;
  nickname: string;
  mail: string;
  code: string;
  sex: Sex;
  phone?: string;
}): Promise<void> {
  await api.post<unknown>("/auth/register", body);
}

// 发送邮箱验证码：POST /auth/mailCode?mail=<mail>（mail 为 query 参数）。
export async function sendMailCode(mail: string): Promise<void> {
  await api.post<unknown>(`/auth/mailCode?mail=${encodeURIComponent(mail)}`);
}
