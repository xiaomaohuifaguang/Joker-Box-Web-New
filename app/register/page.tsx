"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { CardFan } from "@/components/CardFan";

const SEX_OPTIONS: Sex[] = ["男", "女", "未知"];

// 方案 A：单线输入框（去框，底部 2px 线，聚焦亮 brand 红线）。
const underlineInput =
  "h-11 rounded-none border-0 border-b-2 border-border bg-transparent px-0 shadow-none focus-visible:border-brand focus-visible:ring-0";

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
            入座——不止于工具，更是你的全能数字助手。
          </p>
        </div>
      </section>

      {/* 表单（右侧 / 移动下方）：方案 B——表单容器做成一张竖向扑克牌。
          左侧 brand 红竖边（直排 JOKER+♠）+ 牌面 bg-surface + 角落 J/♠ + 右缘邮票穿孔。 */}
      <section className="flex min-w-0 items-center justify-center overflow-x-hidden bg-background px-6 py-12">
        <div className="relative flex w-full max-w-lg overflow-hidden rounded-xl border bg-surface shadow-xl">
          {/* 左缘：brand 红竖边 + 直排 JOKER + ♠ */}
          <div className="flex w-12 flex-none flex-col items-center justify-between bg-brand py-5 text-background">
            <span className="font-mono text-xs font-bold tracking-widest [writing-mode:vertical-rl]">
              JOKER
            </span>
            <span className="text-lg leading-none">♠</span>
          </div>

          {/* 牌面 */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              autoComplete="off"
              className="relative flex min-w-0 flex-1 flex-col gap-5 p-7 sm:p-9"
            >
              {/* 角落 J/♠ 标记（右上 / 左下） */}
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
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">入座</h1>
                <p className="mt-2 text-sm text-muted-foreground">注册一个账号</p>
              </div>
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
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>昵称 *</FormLabel>
                <FormControl>
                  <Input placeholder="昵称" autoComplete="off" {...field} className={underlineInput} />
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
                    {...field} className={underlineInput} />
                </FormControl>
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
