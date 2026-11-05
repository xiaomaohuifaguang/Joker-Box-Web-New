"use client";

import { useAuth } from "@/hooks/useAuth";
import { PublicLanding } from "./PublicLanding";
import { Workbench } from "./Workbench";

// 首页按登录态切换：未登录看介绍，已登录进工作台（外壳已用 useMounted 门控首帧）。
export function HomeInner() {
  const { authenticated } = useAuth();
  return authenticated ? <Workbench /> : <PublicLanding />;
}
