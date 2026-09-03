import type { NextConfig } from "next";

// 桌面（Tauri）环境：tauri CLI 跑 beforeDevCommand/beforeBuildCommand 时会注入
// TAURI_ENV_PLATFORM，此时加载 .env.desktop（注入绝对后端地址 NEXT_PUBLIC_API_BASE）。
// web 开发/构建不会进这个分支，行为不变。
// 加载后必须拿到 NEXT_PUBLIC_API_BASE，否则桌面构建会静默打进相对路径（tauri://
// origin 下必然全挂）——宁可构建失败，也不出坏包。
if (process.env.TAURI_ENV_PLATFORM) {
  try {
    process.loadEnvFile(".env.desktop");
  } catch {
    // 文件缺失/解析失败都由下面的断言兜底
  }
  if (!process.env.NEXT_PUBLIC_API_BASE) {
    throw new Error(
      "[desktop] 缺少 NEXT_PUBLIC_API_BASE：请在项目根目录创建 .env.desktop，" +
        "内容如 NEXT_PUBLIC_API_BASE=http://<后端地址>/joker-box",
    );
  }
}

const nextConfig: NextConfig = {
  output: 'export',
  allowedDevOrigins: ['10.144.0.1', 'localhost'],
};

// 开发期把 /joker-box/* 代理到后端（同源、无 CORS）。
// 生产是静态导出、无 Next 服务器，rewrites 不生效（由 nginx 反代），
// 故仅开发时挂上 rewrites 键，避免生产构建告警。
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => [
    {
      // 匹配所有以 /joker-box 开头的请求，转发到真实后端地址
      source: '/joker-box/:path*',
      destination: 'http://localhost:10251/joker-box/:path*',
    },
  ];
}

export default nextConfig;
