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
import { LogoMark } from "@/components/LogoMark";
import { JesterHat } from "@/components/JesterHat";

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
    <main className="grid min-h-screen md:grid-cols-2">
      {/* 品牌舞台（仅桌面）：harlequin 菱格 + 烫金内框 + 小丑帽 emblem，黑金剧场气质。全 token。 */}
      <section
        className="relative hidden flex-col items-center justify-center gap-10 overflow-hidden border-r bg-surface md:flex"
        style={{
          backgroundImage:
            "repeating-linear-gradient(60deg, transparent 0 23px, color-mix(in srgb, var(--brand) 5%, transparent) 23px 24px), repeating-linear-gradient(-60deg, transparent 0 23px, color-mix(in srgb, var(--brand) 5%, transparent) 23px 24px)",
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-8 border border-brand/30" />
        <JesterHat className="h-24 w-24 text-brand" />
        <div className="text-center">
          <p className="font-display text-3xl font-semibold tracking-tight">Joker Box</p>
          <p className="mt-3 text-sm text-muted-foreground">万千功能，一站聚合</p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Plate Nº 53
        </p>
      </section>

      {/* 表单（右侧 / 移动全宽）：安静单栏，无牌面装扮。 */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <LogoMark className="h-10 w-8" />
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mt-2 text-sm text-muted-foreground">登录以继续</p>

          <form onSubmit={handleSubmit} autoComplete="off" className="mt-8 flex flex-col gap-6">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-xs text-muted-foreground">用户名</Label>
              <Input
                id="username"
                name="username"
                autoComplete="off"
                defaultValue={creds?.username ?? ""}
                placeholder="用户名"
                className="h-11 rounded-none border-0 border-b-2 border-border bg-transparent px-0 shadow-none focus-visible:border-brand focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                defaultValue={creds?.password ?? ""}
                placeholder="密码"
                className="h-11 rounded-none border-0 border-b-2 border-border bg-transparent px-0 shadow-none focus-visible:border-brand focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" name="remember" defaultChecked={!!creds} />
              <Label htmlFor="remember" className="text-sm text-muted-foreground">
                记住密码
              </Label>
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full text-base">
              {loading ? "登录中…" : "登录"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              没有账号？
              <Link href="/register" className="font-medium text-brand hover:underline">
                注册
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
