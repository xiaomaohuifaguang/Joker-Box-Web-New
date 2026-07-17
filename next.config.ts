import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
};

// 开发期把 /joker-box/* 代理到后端（同源、无 CORS）。
// 生产是静态导出、无 Next 服务器，rewrites 不生效（由 nginx 反代），
// 故仅开发时挂上 rewrites 键，避免生产构建告警。
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => [
    {
      // 匹配所有以 /joker-box 开头的请求，转发到真实后端地址
      source: '/joker-box/:path*',
      destination: 'http://localhost:8100/joker-box/:path*',
    },
  ];
}

export default nextConfig;
