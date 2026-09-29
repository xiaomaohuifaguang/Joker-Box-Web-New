import type { ReactNode } from "react";

// 图表卡片外壳：标题 + 副标题 + 内容区（常规后台卡片，跟随主题）。
export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
      <div className="h-72 p-3">{children}</div>
    </div>
  );
}
