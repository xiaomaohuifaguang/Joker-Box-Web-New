"use client";

import { useCallback, useEffect, useState } from "react";
import { PostList } from "./PostList";
import { PostDetail } from "./PostDetail";
import { NewPost } from "./NewPost";

// 视图状态：列表 / 详情 / 发帖。
type View = { name: "list" } | { name: "detail"; id: number } | { name: "new" };

// 从 URL query 解析视图（?thread=id / ?new=1 / 无参=列表）。
function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const thread = p.get("thread");
  if (thread) return { name: "detail", id: Number(thread) };
  if (p.get("new") === "1") return { name: "new" };
  return { name: "list" };
}

function viewToUrl(v: View): string {
  if (v.name === "detail") return `/ganDaShi?thread=${v.id}`;
  if (v.name === "new") return "/ganDaShi?new=1";
  return "/ganDaShi";
}

// 三视图切换。state 为主（渲染可靠），URL 用原生 pushState 同步（可分享/刷新还原）。
// 不用 router.push：同 path 仅改 query 时静态导出的软导航不可靠（返回按钮偶发无效）。
export function ForumInner() {
  // 初始视图从当前 URL 解析（仅首帧；客户端）。
  const [view, setView] = useState<View>(() =>
    typeof window === "undefined" ? { name: "list" } : parseView(window.location.search),
  );

  // 前进/后退（浏览器按钮）-> 同步回 state。
  useEffect(() => {
    const onPop = () => setView(parseView(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((v: View) => {
    window.history.pushState(null, "", viewToUrl(v));
    setView(v);
  }, []);

  if (view.name === "detail") {
    return <PostDetail postId={view.id} onBack={() => go({ name: "list" })} />;
  }
  if (view.name === "new") {
    return <NewPost onBack={() => go({ name: "list" })} />;
  }
  return (
    <PostList
      onOpen={(id) => go({ name: "detail", id })}
      onNew={() => go({ name: "new" })}
    />
  );
}
