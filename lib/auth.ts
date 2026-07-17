// 登录 token 管理：存 localStorage。
// 静态导出下登录态全在客户端；真正的鉴权边界仍是后端校验 token。
// 这些函数只在客户端调用，但构建期类型检查/预渲染时 window 可能不存在，故加守卫。

const TOKEN_KEY = "auth_token";
const AUTH_EVENT = "auth_token_change";

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  emitChange();
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  emitChange();
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

// 订阅登录态变化：跨标签页用 storage 事件，同标签页用自定义事件。
// 供 useSyncExternalStore 使用，避免在 effect 里 setState。
export function onAuthChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(AUTH_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTH_EVENT, handler);
  };
}
