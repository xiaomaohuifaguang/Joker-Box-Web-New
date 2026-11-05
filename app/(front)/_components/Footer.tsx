import { Container } from "@/components/Container";

// 前台底部：版权 + 平台标语（内容区同宽对齐）。
export function Footer() {
  return (
    <footer className="border-t">
      <Container className="flex items-center justify-between py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Joker Box</span>
        <span className="font-mono">an aggregation platform</span>
      </Container>
    </footer>
  );
}
