import { Bookmark, Bot, FolderOpen, Stamp, type LucideIcon } from "lucide-react";
import { JesterHat } from "@/components/JesterHat";

const POINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Bookmark, text: "常用网站按分组收好" },
  { icon: FolderOpen, text: "文件存在云盘，换台电脑也在" },
  { icon: Stamp, text: "在线发起和处理审批" },
  { icon: Bot, text: "选一个模型，和 AI 助手对话" },
];

// 登录/注册页左栏（仅桌面）：说明登录后能做什么。
export function AuthBrandPanel() {
  return (
    <section className="felt-pattern hidden flex-col justify-center border-r bg-surface px-12 md:flex lg:px-20">
      <JesterHat className="h-16 w-16 text-brand" />
      <p className="font-brand mt-6 text-4xl font-semibold tracking-tight">Joker Box</p>
      <p className="mt-3 text-muted-foreground">一个账号，用上你常用的工具。</p>
      <ul className="mt-10 flex flex-col gap-4">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
