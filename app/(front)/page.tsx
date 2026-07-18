// 前台首页：公开（无守卫）。平台定位为聚合平台，文案不绑定到某个具体功能。
// 登录/注册走 Header、后台走 UserMenu，首页 hero 不再重复这些入口。
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span
          className="mb-6 flex h-10 w-8 flex-col items-center justify-center rounded-[3px] border leading-none"
          aria-hidden="true"
        >
          <span className="font-display text-sm font-bold">J</span>
          <span className="text-base leading-none text-brand">♠</span>
        </span>
        <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          Joker Box
        </h1>
        <p className="mt-5 text-lg text-foreground">万千功能，一站聚合。</p>
        <p className="mt-2 text-sm text-muted-foreground">
          不止于工具，更是你的全能数字助手。
        </p>
      </div>

      {/* mission */}
      <div className="px-6 pb-16 text-center">
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted-foreground">
          构建全场景数字生态枢纽，深度整合多元功能模块，为个人与企业提供一站式解决方案。
        </p>
      </div>
    </div>
  );
}
