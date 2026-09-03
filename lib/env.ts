// 构建时内联的公共环境变量（仅 NEXT_PUBLIC_ 前缀会被打包进静态产物）。
// 注意：静态导出下环境变量在「构建时」取值，换环境需重新构建。
// 后端接口地址：默认相对路径 /joker-box（web：dev 由 next.config.ts rewrites 代理，prod 由 nginx 反代）。
// 桌面（Tauri）构建时由 next.config.ts 加载 .env.desktop 注入绝对地址（如 http://<后端>/joker-box），
// 因为要内联进产物，换后端地址需重新 build:desktop。
export const env = {
  apiBase: process.env.NEXT_PUBLIC_API_BASE ?? "/joker-box",
} as const;
