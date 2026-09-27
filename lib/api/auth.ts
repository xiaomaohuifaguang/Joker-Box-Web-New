import { api } from "@/lib/api";
import type { User } from "@/types";

export type Sex = "男" | "女" | "未知";

// 登录：POST /auth/getToken，返回 token 字符串（data 直接是 token）。
export async function login(username: string, password: string): Promise<string> {
  const { data } = await api.post<string>("/auth/getToken", {
    body: { username, password },
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
  await api.post<unknown>("/auth/register", { body });
}

// 发送邮箱验证码：POST /auth/mailCode?mail=<mail>。
export async function sendMailCode(mail: string): Promise<void> {
  await api.post<unknown>("/auth/mailCode", { params: { mail } });
}

// 修改密码：POST /auth/changePassword?oldPassword=&newPassword=（query 传参，无 body）。
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post<unknown>("/auth/changePassword", {
    params: { oldPassword, newPassword },
  });
}

// 更新用户信息：POST /auth/updateUserInfo。专用 body 类型保证只发后端允许修改的 4 个字段；
// phone 传 null 显式清除（后端 Long）。
export type UpdateUserInfoBody = {
  userId: string;
  nickname: string;
  sex: Sex;
  phone: number | null;
};

export async function updateUserInfo(body: UpdateUserInfoBody): Promise<void> {
  await api.post<unknown>("/auth/updateUserInfo", { body });
}
