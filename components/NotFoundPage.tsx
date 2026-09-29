import { FrontShell } from "@/app/(front)/_components/FrontShell";
import { ErrorState } from "@/components/ErrorState";

// 前台外壳的 404 页（FrontShell 跟随用户布局偏好：top=Header/Footer，side=侧栏 app-shell）。
// 供 app/not-found.tsx 与 RequireAdmin（非 admin 访问后台）复用。
export function NotFoundPage() {
  return (
    <FrontShell>
      <ErrorState
        code="404"
        title="找不到页面"
        message="这个地址不在牌盒里。回首页看看吧。"
      />
    </FrontShell>
  );
}
