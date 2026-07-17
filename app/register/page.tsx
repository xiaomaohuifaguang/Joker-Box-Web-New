"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { register, sendMailCode, type Sex } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SEX_OPTIONS: Sex[] = ["男", "女", "未知"];

// 注册页：不做登录重定向（URL 可直接进入）；注册成功跳 /login。
// 关闭浏览器 autofill：form autoComplete="off"，密码框用 "new-password"。
export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [mail, setMail] = useState("");
  const [code, setCode] = useState("");
  const [sex, setSex] = useState<Sex>("未知");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  // 验证码 60s 倒计时（setState 在 setTimeout 回调里，非 effect 体）
  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = setTimeout(() => setCodeCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCooldown]);

  async function handleSendCode() {
    if (!mail) {
      setError("请先填写邮箱");
      return;
    }
    setError(null);
    try {
      await sendMailCode(mail);
      setCodeCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "验证码发送失败");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username || !password || !confirmPassword || !nickname || !mail || !code) {
      setError("请填写必填项");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      await register({
        username,
        password,
        nickname,
        mail,
        code,
        sex,
        phone: phone || undefined,
      });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-6 py-12">
      <form onSubmit={handleSubmit} autoComplete="off" className="flex w-96 flex-col gap-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">注册 Joker Box</h1>
          <p className="mt-1 text-sm text-muted-foreground">万千功能，一站聚合</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2">
          <Label htmlFor="username">用户名 *</Label>
          <Input
            id="username"
            autoComplete="off"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">密码 *</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">确认密码 *</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname">昵称 *</Label>
          <Input
            id="nickname"
            autoComplete="off"
            placeholder="昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mail">邮箱 *</Label>
          <Input
            id="mail"
            type="email"
            autoComplete="off"
            placeholder="邮箱"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="code">验证码 *</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              autoComplete="off"
              placeholder="邮箱验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={codeCooldown > 0 || !mail}
              className="shrink-0"
            >
              {codeCooldown > 0 ? `${codeCooldown}s` : "发送验证码"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>性别</Label>
          <RadioGroup
            value={sex}
            onValueChange={(v) => setSex(v as Sex)}
            className="flex gap-4"
          >
            {SEX_OPTIONS.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <RadioGroupItem value={s} id={`sex-${s}`} />
                <Label htmlFor={`sex-${s}`}>{s}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">手机号</Label>
          <Input
            id="phone"
            autoComplete="off"
            placeholder="手机号（选填）"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "注册中…" : "注册"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          已有账号？
          <Link href="/login" className="text-foreground">
            登录
          </Link>
        </p>
      </form>
    </main>
  );
}
