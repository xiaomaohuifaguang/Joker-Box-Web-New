import { cn } from "@/lib/utils";

// 品牌签名：一摞扇形展开的 J♠ 牌（扑克牌面）。登录/注册品牌舞台共用。
// 全 token 上色（surface 牌面 / brand 红花色 / felt 桌绿 / border 描边），5 预设×明暗自动跟随。
// size 控制整体缩放（牌面 w = size、高 = size*1.4 近似扑克比例）。

function PlayingCard({
  className,
  style,
  back = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  back?: boolean; // 背面（felt/brand 斜线纹），不显示花色
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "relative flex items-center justify-center rounded-md border bg-surface shadow-lg",
        className,
      )}
    >
      {back ? (
        // 牌背：牌桌绿 + 斜线纹（呼应 Joker 蚀刻排线）
        <div
          className="absolute inset-1 rounded-[calc(var(--radius)*0.5)] border border-background/40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, color-mix(in srgb, var(--felt) 55%, transparent) 0 4px, transparent 4px 8px)",
            backgroundColor: "color-mix(in srgb, var(--felt) 22%, var(--surface))",
          }}
        />
      ) : (
        <>
          {/* 角落 rank/suit（左上） */}
          <span className="absolute left-1.5 top-1 flex flex-col items-center leading-none">
            <span className="font-mono font-bold text-foreground" style={{ fontSize: "0.9em" }}>
              J
            </span>
            <span className="text-brand" style={{ fontSize: "0.9em" }}>
              ♠
            </span>
          </span>
          {/* 角落 rank/suit（右下，旋转 180） */}
          <span className="absolute bottom-1 right-1.5 flex rotate-180 flex-col items-center leading-none">
            <span className="font-mono font-bold text-foreground" style={{ fontSize: "0.9em" }}>
              J
            </span>
            <span className="text-brand" style={{ fontSize: "0.9em" }}>
              ♠
            </span>
          </span>
          {/* 中央大花色 */}
          <span className="text-brand" style={{ fontSize: "2.2em", lineHeight: 1 }}>
            ♠
          </span>
        </>
      )}
    </div>
  );
}

export function CardFan({
  size = 96,
  className,
}: {
  size?: number; // 单张牌宽（px）
  className?: string;
}) {
  const h = Math.round(size * 1.4);
  const offset = Math.round(size * 0.55); // 扇形横向偏移
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ height: h + Math.round(size * 0.3) }}
      aria-hidden="true"
    >
      {/* 左牌（背面，-12°） */}
      <PlayingCard
        back
        className="absolute transition-transform duration-300"
        style={{
          width: size,
          height: h,
          transform: `translateX(-${offset}px) rotate(-12deg)`,
        }}
      />
      {/* 右牌（背面，+12°） */}
      <PlayingCard
        back
        className="absolute transition-transform duration-300"
        style={{
          width: size,
          height: h,
          transform: `translateX(${offset}px) rotate(12deg)`,
        }}
      />
      {/* 中牌（正面 J♠，前凸） */}
      <PlayingCard
        className="absolute shadow-xl transition-transform duration-300 hover:-translate-y-2"
        style={{ width: size, height: h, fontSize: size / 5 }}
      />
    </div>
  );
}
