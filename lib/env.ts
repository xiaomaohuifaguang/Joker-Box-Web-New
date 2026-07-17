// 构建时内联的公共环境变量（仅 NEXT_PUBLIC_ 前缀会被打包进静态产物）。
// 注意：静态导出下环境变量在「构建时」取值，换环境需重新构建。
// 后端接口地址不在此配置：开发由 next.config.ts 的 rewrites 代理 /joker-box/*，
// 生产由 nginx 反代。这里留给将来其它 NEXT_PUBLIC_ 变量。
export const env = {
  // 例：someKey: process.env.NEXT_PUBLIC_SOME_KEY,
} as const;
