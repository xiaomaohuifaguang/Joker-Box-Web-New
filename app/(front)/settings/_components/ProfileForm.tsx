"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { updateUserInfo, type Sex } from "@/lib/api/auth";
import { setUser } from "@/lib/user";
import { useUser } from "@/hooks/useUser";
import type { User } from "@/types";
import { AvatarUpload } from "@/app/(front)/settings/_components/AvatarUpload";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

const SEX_OPTIONS: Sex[] = ["男", "女", "未知"];

// 手机号：留空提交 null 显式清除；非空必须 11 位手机号
const schema = z.object({
  nickname: z.string().trim().min(1, "请输入昵称").max(32, "昵称最长 32 字"),
  sex: z.enum(["男", "女", "未知"] as const),
  phone: z
    .string()
    .trim()
    .regex(/^1\d{10}$/, "请输入 11 位手机号")
    .or(z.literal("")),
});

type ProfileValues = z.infer<typeof schema>;

// 个人资料：头像上传 + 昵称/性别/手机号。守卫只保证已登录，user 缓存可能尚在拉取，
// 故拆外层等 user、内层再以 user 初始化表单（避免条件 hook）。
export function ProfileForm() {
  const { user } = useUser();
  if (!user) return null;
  return <ProfileFormInner user={user} />;
}

function ProfileFormInner({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nickname: user.nickname ?? "",
      sex: (user.sex as Sex) || "未知",
      phone: user.phone ? String(user.phone) : "",
    },
  });

  async function onSubmit(values: ProfileValues) {
    setLoading(true);
    try {
      const phone = values.phone === "" ? null : Number(values.phone);
      await updateUserInfo({
        userId: user.userId,
        nickname: values.nickname,
        sex: values.sex,
        phone,
      });
      // 合并本地缓存触发 user_change，Header/头像菜单的昵称即时更新（phone 清除时等下次 UserBootstrap 重拉）
      setUser({
        ...user,
        nickname: values.nickname,
        sex: values.sex,
        ...(phone != null ? { phone } : {}),
      });
      toast.success("资料已保存");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-brand" />
          个人资料
        </CardTitle>
        <CardDescription>更新你的头像、昵称、性别和手机号。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <AvatarUpload />
        <Separator />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            autoComplete="off"
            className="flex max-w-lg flex-col gap-5"
          >
            {/* 用户名不可修改（后端仅允许改昵称/性别/手机号），只读展示 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm leading-none font-medium select-none">
                用户名
              </span>
              <Input value={`@${user.username}`} disabled />
            </div>
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>昵称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="昵称" {...field} />
                  </FormControl>
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
                          <RadioGroupItem value={s} id={`profile-sex-${s}`} />
                          <Label htmlFor={`profile-sex-${s}`}>{s}</Label>
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
                      placeholder="手机号（留空则清除）"
                      inputMode="numeric"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "保存中…" : "保存修改"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
