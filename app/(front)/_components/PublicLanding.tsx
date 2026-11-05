import Link from "next/link";
import type { CSSProperties } from "react";
import { Bookmark, Bot, FolderOpen, MessagesSquare, Stamp, Wrench, type LucideIcon } from "lucide-react";
import { Container } from "@/components/Container";
import { JesterHat } from "@/components/JesterHat";
import { Button } from "@/components/ui/button";

// 能力牌只做介绍，不链接受保护页面：未登录访问会进 404。
const CAPABILITIES: { icon: LucideIcon; name: string; description: string }[] = [
  { icon: Bookmark, name: "收藏网站", description: "常用站点按分组收好，打开就能找到。" },
  { icon: FolderOpen, name: "云盘", description: "上传、整理和下载文件，换台电脑也在。" },
  { icon: MessagesSquare, name: "论坛", description: "发帖讨论，支持富文本和评论。" },
  { icon: Stamp, name: "流程审批", description: "发起申请、跟踪进度、处理待办。" },
  { icon: Wrench, name: "小工具", description: "JSON 格式化和 cron 表达式，随手就用。" },
  { icon: Bot, name: "AI 助手", description: "选一个模型，直接开始对话。" },
];

// 未登录首页：左侧说清楚能做什么，右侧把每项能力摊成一张牌。
export function PublicLanding() {
  return (
    <div className="felt-pattern flex flex-1 items-center overflow-hidden">
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:py-20">
        <div>
          <h1 className="font-brand text-5xl font-semibold tracking-tight sm:text-6xl">
            Joker Box
          </h1>
          <p className="mt-5 max-w-lg text-xl leading-relaxed">
            一个账号，用上收藏夹、云盘、论坛、审批和 AI 助手。
          </p>
          <p className="mt-3 text-muted-foreground">个人和团队都能用。</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">注册账号</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/website">浏览收藏网站</Link>
            </Button>
          </div>
        </div>

        <ul className="hero-fan" aria-label="Joker Box 的功能">
          {CAPABILITIES.map(({ icon: Icon, name, description }, i) => (
            <li
              key={name}
              tabIndex={0}
              style={{ "--i": i, "--fan": `${(i - 2.5) * 11}deg` } as CSSProperties}
              className="hero-card relative flex flex-col rounded-lg border bg-surface p-4 shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="mt-2 font-semibold">{name}</p>
              <p className="hero-card-text text-caption mt-2 text-muted-foreground">{description}</p>
              <JesterHat
                className="absolute right-3 bottom-3 h-7 w-7 text-brand/40"
              />
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
