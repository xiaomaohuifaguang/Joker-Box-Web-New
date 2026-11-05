import { HomeInner } from "./_components/HomeInner";

// 前台首页：公开（无守卫）。未登录 = 产品介绍，已登录 = 工作台。
export default function Home() {
  return <HomeInner />;
}
