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
import { CardFan } from "@/components/CardFan";

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
      {/* 品牌舞台（桌面左侧 / 移动顶部横条）：牌桌绿 + 蚀刻排线 + 扇形牌 + 标语。全 token。 */}
      <section
        className="relative flex flex-col items-center justify-center gap-6 overflow-hidden bg-felt px-6 py-12 md:gap-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(52deg, transparent 0 5px, color-mix(in srgb, var(--background) 5%, transparent) 5px 6px), repeating-linear-gradient(-38deg, transparent 0 7px, color-mix(in srgb, var(--brand) 6%, transparent) 7px 8px)",
        }}
      >
        <CardFan size={104} className="scale-[0.55] md:scale-100" />
        <div className="text-center">
          <p className="font-display text-2xl font-semibold text-background md:text-3xl">
            万千功能，一站聚合
          </p>
          <p className="mt-2 text-sm text-background/70 md:mt-3">
            发牌入座——不止于工具，更是你的全能数字助手。
          </p>
        </div>
      </section>

      {/* 表单（右侧 / 移动下方）：方案 B——表单容器做成一张竖向扑克牌。
          左侧 brand 红竖边（直排 JOKER+♠）+ 牌面 bg-surface + 角落 J/♠ + 右缘邮票穿孔。 */}
      <section className="flex min-w-0 items-center justify-center overflow-x-hidden bg-background px-6 py-12">
        <div className="relative flex w-full max-w-md overflow-hidden rounded-xl border bg-surface shadow-xl">
          {/* 左缘：brand 红竖边 + 直排 JOKER + ♠ */}
          <div className="flex w-12 flex-none flex-col items-center justify-between bg-brand py-5 text-background">
            <span className="font-mono text-xs font-bold tracking-widest [writing-mode:vertical-rl]">
              JOKER
            </span>
            <span className="text-lg leading-none">♠</span>
          </div>

          {/* 牌面 */}
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="relative flex min-w-0 flex-1 flex-col gap-6 p-7 sm:p-9"
          >
            {/* 角落 J/♠ 标记（左上 / 右下） */}
            <span aria-hidden className="pointer-events-none absolute right-4 top-3 flex flex-col items-center leading-none">
              <span className="font-mono text-sm font-bold text-foreground">J</span>
              <span className="text-sm text-brand">♠</span>
            </span>
            <span aria-hidden className="pointer-events-none absolute bottom-3 left-4 flex rotate-180 flex-col items-center leading-none">
              <span className="font-mono text-sm font-bold text-foreground">J</span>
              <span className="text-sm text-brand">♠</span>
            </span>

            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-brand">Joker Box</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">欢迎回座</h1>
              <p className="mt-2 text-sm text-muted-foreground">登录以继续</p>
            </div>
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

          {/* 右缘：邮票穿孔（径向点阵） */}
          <div
            aria-hidden
            className="w-3 flex-none border-l border-dashed border-border"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--border) 1.5px, transparent 1.5px)",
              backgroundSize: "100% 14px",
              backgroundPosition: "center",
            }}
          />
        </div>
      </section>
    </main>
  );
}
