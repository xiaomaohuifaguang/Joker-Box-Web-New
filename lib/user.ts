// 当前登录用户信息缓存：存 localStorage，供 useUser 响应式读取。
// 真正的鉴权边界仍是后端；这里只是缓存登录后拉取到的用户信息。

import { getUserInfo } from "@/lib/api/auth";
import type { User } from "@/types";

const USER_KEY = "user";
const USER_EVENT = "user_change";

// 缓存解析结果，保证 useSyncExternalStore 的 getSnapshot 返回稳定引用（避免无限渲染）。
let cached: User | null | undefined = undefined;

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USER_EVENT));
}

function readFromStorage(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getUser(): User | null {
  if (cached === undefined) cached = readFromStorage();
  return cached;
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  cached = user;
  emitChange();
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
  cached = null;
  emitChange();
}

// 订阅用户信息变化（同标签页自定义事件 + 跨标签页 storage 事件）。
export function onUserChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === USER_KEY) {
      cached = undefined; // 跨标签页变更，失效缓存
      callback();
    }
  };
  window.addEventListener(USER_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(USER_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

// 拉取并缓存当前用户信息（登录后 / token 存在但无缓存时调用）。
export async function fetchUserInfo(): Promise<User> {
  const user = await getUserInfo();
  setUser(user);
  return user;
}
