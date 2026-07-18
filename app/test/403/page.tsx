import { ForbiddenPage } from "@/components/ForbiddenPage";

// 测试页：直接展示现有 403 页面（无需鉴权，未登录可见），便于调试样式。
export default function ForbiddenTestPage() {
  return <ForbiddenPage />;
}
