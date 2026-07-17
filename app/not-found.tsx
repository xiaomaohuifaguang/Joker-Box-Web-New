import { NotFoundPage } from "@/components/NotFoundPage";

// 全局 404：未匹配路由（不论登录态）都进这里，套前台外壳。
export default function NotFound() {
  return <NotFoundPage />;
}
