"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { changePassword } from "@/lib/api/auth";
import { PasswordInput } from "@/app/(front)/settings/_components/PasswordInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// 后端密码规则：7-19 位，仅限字母数字及常用特殊字符
const PASSWORD_RE = /^[A-Za-z0-9!@#$%^&*(),.?\/\-+*|\\=<>;:"]{7,19}$/;
const PASSWORD_RULE_TEXT = "7-19 位，仅限字母、数字及常用特殊字符";

const schema = z
  .object({
    oldPassword: z.string().min(1, "请输入原密码"),
    newPassword: z
      .string()
      .regex(PASSWORD_RE, `密码需 ${PASSWORD_RULE_TEXT}`),
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type SecurityValues = z.infer<typeof schema>;

// 修改密码：成功后保持登录态（若后端使旧 token 失效，api 层 401 处理会自动清 token）。
export function SecurityForm() {
  const [loading, setLoading] = useState(false);
  const form = useForm<SecurityValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: SecurityValues) {
    setLoading(true);
    try {
      await changePassword(values.oldPassword, values.newPassword);
      toast.success("密码已修改");
      form.reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-brand" />
          账号安全
        </CardTitle>
        <CardDescription>
          定期更换密码可以保护账号安全。修改成功后保持当前登录状态。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            autoComplete="off"
            className="flex max-w-lg flex-col gap-5"
          >
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>原密码 *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="原密码"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码 *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="新密码"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{PASSWORD_RULE_TEXT}。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认新密码 *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="再次输入新密码"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "提交中…" : "修改密码"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
