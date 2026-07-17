// 记住的登录凭证：base64 混淆存 localStorage（仅防偷瞄，挡不住 XSS）。
// 本项目 token 也在 localStorage（同一 XSS 面）；密码更敏感（常跨站复用），
// 生产环境建议改「记住登录」（长效 token）而非存密码。

const CREDS_KEY = "remember-creds";
const CREDS_EVENT = "creds_change";

let cached: { username: string; password: string } | null | undefined = undefined;

// Unicode 安全的 base64（encodeURIComponent 先把非 ASCII 转 %XX，再 btoa）
function encode(s: string): string {
  return btoa(encodeURIComponent(s));
}
function decode(s: string): string {
  return decodeURIComponent(atob(s));
}

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CREDS_EVENT));
}

function readFromStorage(): { username: string; password: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CREDS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(decode(raw));
  } catch {
    return null;
  }
}

export function getCredentials(): { username: string; password: string } | null {
  if (cached === undefined) cached = readFromStorage();
  return cached;
}

export function saveCredentials(username: string, password: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CREDS_KEY,
    encode(JSON.stringify({ username, password })),
  );
  cached = { username, password };
  emitChange();
}

export function clearCredentials(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CREDS_KEY);
  cached = null;
  emitChange();
}

export function onCredentialsChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(CREDS_EVENT, handler);
  window.addEventListener("storage", handler); // 跨标签页
  return () => {
    window.removeEventListener(CREDS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
