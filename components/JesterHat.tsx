// 品牌小丑帽（大王/小丑的标志物，Joker 牌面无花色——不用 ♠♥♣♦）。
// 三尖帽身用 currentColor（跟着外层 text-* 走），铃铛固定 var(--brand-2) 点睛红。
// 尺寸由外部 className/style 控制（h-* w-*）。

export function JesterHat({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      {/* 左尖（向左垂） */}
      <path fill="currentColor" d="M5.2 15C4.2 11.5 3.2 9.2 2.6 7c2 .8 4.6 3.8 6.6 8H5.2Z" />
      {/* 右尖（向右垂） */}
      <path fill="currentColor" d="M18.8 15c1-3.5 2-5.8 2.6-8-2 .8-4.6 3.8-6.6 8h4Z" />
      {/* 中尖（直立） */}
      <path fill="currentColor" d="M9.8 15c.1-4 1-7.4 2.2-10.2C13.2 7.6 14.1 11 14.2 15H9.8Z" />
      {/* 帽箍 */}
      <rect x="4" y="15" width="16" height="3.2" rx="1.2" fill="currentColor" />
      {/* 三铃（点睛红） */}
      <circle cx="2.6" cy="5.6" r="1.5" fill="var(--brand-2)" />
      <circle cx="12" cy="3.6" r="1.5" fill="var(--brand-2)" />
      <circle cx="21.4" cy="5.6" r="1.5" fill="var(--brand-2)" />
    </svg>
  );
}
