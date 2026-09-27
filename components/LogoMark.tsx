import { cn } from "@/lib/utils";
import { JesterHat } from "@/components/JesterHat";

// 品牌 logo 标记：迷你牌面 + 小丑帽（大王，不是 Jack——Joker 牌无花色）。
// 前台 Header / 后台 Sidebar / 首页 hero 共用；className 控制尺寸（默认 h-7 w-6）。

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-6 items-center justify-center rounded-[3px] border",
        className,
      )}
      aria-hidden="true"
    >
      <JesterHat className="h-[62%] w-[62%] text-brand" />
    </span>
  );
}
