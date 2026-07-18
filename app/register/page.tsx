"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { register, sendMailCode, type Sex } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const SEX_OPTIONS: Sex[] = ["男", "女", "未知"];

// 注册表单校验：必填项 + 邮箱格式 + 两次密码一致（错误挂在 confirmPassword）。
const schema = z
  .object({
    username: z.string().min(1, "请输入用户名"),
    password: z.string().min(1, "请输入密码"),
    confirmPassword: z.string().min(1, "请再次输入密码"),
    nickname: z.string().min(1, "请输入昵称"),
    mail: z.email("请输入有效邮箱"),
    code: z.string().min(1, "请输入验证码"),
    sex: z.enum(["男", "女", "未知"] as const),
    phone: z.string().optional(),
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
      nickname: "",
      mail: "",
      code: "",
      sex: "未知",
      phone: "",
    },
  });

  const mail = form.watch("mail");

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
        nickname: values.nickname,
        mail: values.mail,
        code: values.code,
        sex: values.sex,
        phone: values.phone || undefined,
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
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          className="flex w-96 flex-col gap-4"
        >
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">注册 Joker Box</h1>
            <p className="mt-1 text-sm text-muted-foreground">万千功能，一站聚合</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名 *</FormLabel>
                <FormControl>
                  <Input placeholder="用户名" autoComplete="off" {...field} />
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
                    {...field}
                  />
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>昵称 *</FormLabel>
                <FormControl>
                  <Input placeholder="昵称" autoComplete="off" {...field} />
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
                    {...field}
                  />
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
                      {...field}
                    />
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

          <FormField
            control={form.control}
            name="sex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>性别</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as Sex)}
                    className="flex gap-4"
                  >
                    {SEX_OPTIONS.map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <RadioGroupItem value={s} id={`sex-${s}`} />
                        <Label htmlFor={`sex-${s}`}>{s}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>手机号</FormLabel>
                <FormControl>
                  <Input
                    placeholder="手机号（选填）"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
      </Form>
    </main>
  );
}
