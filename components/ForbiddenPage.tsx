import { Header } from "@/app/(front)/_components/Header";
import { Footer } from "@/app/(front)/_components/Footer";
import { ErrorState } from "@/components/ErrorState";
import { FORBIDDEN_PROPS } from "@/lib/error-pages";

// 前台外壳的 403 页（Header + 403 内容 + Footer）。
// 供 /test/403 测试路由复用；文案来自 lib/error-pages，与 RequirePermission 共用。
export function ForbiddenPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <ErrorState {...FORBIDDEN_PROPS} />
      </main>
      <Footer />
    </>
  );
}
