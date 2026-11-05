import { Container } from "@/components/Container";

// 前台底部：版权（右下角留给 AI 助手悬浮钮，不放内容）。
export function Footer() {
  return (
    <footer className="border-t">
      <Container className="py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Joker Box
      </Container>
    </footer>
  );
}
