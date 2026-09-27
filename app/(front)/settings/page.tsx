import { permanentRedirect } from "next/navigation";

// /settings → /settings/profile。静态导出下构建期渲染捕获 NEXT_REDIRECT 并注入
// <meta http-equiv="refresh">（Next 16 make-get-server-inserted-html），零客户端 JS。
export default function SettingsIndexPage() {
  permanentRedirect("/settings/profile");
}
