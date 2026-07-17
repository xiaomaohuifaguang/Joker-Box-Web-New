import { Header } from "@/app/(front)/_components/Header";
import { Footer } from "@/app/(front)/_components/Footer";
import { ErrorState } from "@/components/ErrorState";

// 前台外壳的 404 页（Header + 404 内容 + Footer）。
// 供 app/not-found.tsx 与 RequireAdmin（非 admin 访问后台）复用。
export function NotFoundPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <ErrorState
          code="404"
          title="找不到页面"
          message="这个地址不在牌盒里。回首页看看吧。"
        />
      </main>
      <Footer />
    </>
  );
}
