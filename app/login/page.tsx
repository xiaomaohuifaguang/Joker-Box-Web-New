"use client";

import { useEffect, useSyncExternalStore, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/api/auth";
import { isLoggedIn, onAuthChange, setToken } from "@/lib/auth";
import { useMounted } from "@/hooks/useMounted";
import { useCredentials } from "@/hooks/useCredentials";
import { clearCredentials, getCredentials, saveCredentials } from "@/lib/credentials";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 统一登录页：已登录则跳走；提交账密拿 token；「记住密码」base64 存 localStorage。
// 输入框非受控（defaultValue 从记住的凭证回填），关浏览器 autofill（密码框 new-password）。

// 从 URL 读 from，校验以 / 开头防开放重定向；默认 /（首页）。
function getRedirectTarget(): string {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  return from && from.startsWith("/") ? from : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const mounted = useMounted();
  const authenticated = useSyncExternalStore(
    onAuthChange,
    () => isLoggedIn(),
    () => false,
  );
  const creds = useCredentials();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 首帧不判定；挂载后若已登录则跳走（避免登录表单一闪而过）
  useEffect(() => {
    if (!mounted) return;
    if (authenticated) router.replace(getRedirectTarget());
  }, [mounted, authenticated, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const username = String(fd.get("username") ?? "");
      const password = String(fd.get("password") ?? "");
      const remember = fd.get("remember") != null;

      const token = await login(username, password);
      // 记住密码：勾选 -> 存；不勾选且同账号已存 -> 清空
      if (remember) {
        saveCredentials(username, password);
      } else {
        const saved = getCredentials();
        if (saved && saved.username === username) clearCredentials();
      }
      setToken(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;
  if (authenticated) return null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} autoComplete="off" className="flex w-80 flex-col gap-4">
        <div className="text-center">
          <span
            className="mb-3 inline-flex h-9 w-7 flex-col items-center justify-center rounded-[3px] border leading-none"
            aria-hidden="true"
          >
            <span className="font-display text-xs font-bold">J</span>
            <span className="text-sm leading-none text-brand">♠</span>
          </span>
          <h1 className="font-display text-xl font-semibold">登录 Joker Box</h1>
          <p className="mt-1 text-sm text-muted-foreground">万千功能，一站聚合</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            name="username"
            autoComplete="off"
            defaultValue={creds?.username ?? ""}
            placeholder="用户名"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            defaultValue={creds?.password ?? ""}
            placeholder="密码"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" defaultChecked={!!creds} />
          <Label htmlFor="remember" className="text-sm text-muted-foreground">
            记住密码
          </Label>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "登录中…" : "登录"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          没有账号？
          <Link href="/register" className="text-foreground">
            注册
          </Link>
        </p>
      </form>
    </main>
  );
}
