// 前台底部：版权 + 平台标语（mono）。
export function Footer() {
  return (
    <footer className="border-t">
      <div className="flex items-center justify-between px-6 py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Joker Box</span>
        <span className="font-mono">an aggregation platform</span>
      </div>
    </footer>
  );
}
