"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { register, sendMailCode } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LogoMark } from "@/components/LogoMark";
import { JesterHat } from "@/components/JesterHat";

// 方案 A：单线输入框（去框，底部 2px 线，聚焦亮 brand 线）。
const underlineInput =
  "h-11 rounded-none border-0 border-b-2 border-border bg-transparent px-0 shadow-none focus-visible:border-brand focus-visible:ring-0";

// 注册表单校验：必填项 + 邮箱格式 + 两次密码一致（错误挂在 confirmPassword）。
// 表单只收最少字段；nickname/sex 后端契约必填，提交时填默认值（nickname=用户名、sex=未知）。
const schema = z
  .object({
    username: z.string().min(1, "请输入用户名"),
    password: z.string().min(1, "请输入密码"),
    confirmPassword: z.string().min(1, "请再次输入密码"),
    mail: z.email("请输入有效邮箱"),
    code: z.string().min(1, "请输入验证码"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof schema>;

// 注册页：不做登录重定向（URL 可直接进入）；注册成功跳 /login。
// 关闭浏览器 autofill：form autoComplete="off"，密码框用 "new-password"。
export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      mail: "",
      code: "",
    },
  });

  const mail = useWatch({ control: form.control, name: "mail" });

  // 验证码 60s 倒计时（setState 在 setTimeout 回调里，非 effect 体）
  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = setTimeout(() => setCodeCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCooldown]);

  async function handleSendCode() {
    const mailValue = form.getValues("mail");
    if (!mailValue) {
      setError("请先填写邮箱");
      return;
    }
    setError(null);
    try {
      await sendMailCode(mailValue);
      setCodeCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "验证码发送失败");
    }
  }

  async function onSubmit(values: RegisterValues) {
    setError(null);
    setLoading(true);
    try {
      await register({
        username: values.username,
        password: values.password,
        nickname: values.username,
        mail: values.mail,
        code: values.code,
        sex: "未知",
      });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

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
          <p className="mt-3 text-sm text-muted-foreground">不止于工具，更是你的全能数字助手</p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Plate Nº 53
        </p>
      </section>

      {/* 表单（右侧 / 移动全宽）：安静单栏，无牌面装扮。 */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <LogoMark className="h-10 w-8" />
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">创建账号</h1>
          <p className="mt-2 text-sm text-muted-foreground">注册以开始使用</p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              autoComplete="off"
              className="mt-8 flex flex-col gap-5"
            >
              {error && <p className="text-sm text-destructive">{error}</p>}

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="用户名" autoComplete="off" {...field} className={underlineInput} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码 *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="密码"
                        autoComplete="new-password"
                        {...field} className={underlineInput} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认密码 *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="再次输入密码"
                        autoComplete="new-password"
                        {...field} className={underlineInput} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱 *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="邮箱"
                        autoComplete="off"
                        {...field} className={underlineInput} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>验证码 *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="邮箱验证码"
                          autoComplete="off"
                          {...field} className={underlineInput} />
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={loading} className="h-11 w-full text-base">
                {loading ? "注册中…" : "注册"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                已有账号？
                <Link href="/login" className="font-medium text-brand hover:underline">
                  登录
                </Link>
              </p>
            </form>
          </Form>
        </div>
      </section>
    </main>
  );
}
