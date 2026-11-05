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
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { LogoMark } from "@/components/LogoMark";

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
      <AuthBrandPanel />

      {/* 表单（右侧 / 移动全宽） */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <LogoMark className="h-10 w-8" />
          <h1 className="mt-6 text-3xl font-semibold">创建账号</h1>
          <p className="mt-2 text-sm text-muted-foreground">所有项目都必填，邮箱用于接收验证码。</p>

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
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} className="h-11" />
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
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field} className="h-11" />
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
                    <FormLabel>确认密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field} className="h-11" />
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
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="off"
                        {...field} className="h-11" />
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
                    <FormLabel>验证码</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          autoComplete="off"
                          {...field} className="h-11" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        disabled={codeCooldown > 0 || !mail}
                        className="h-11 shrink-0"
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
