"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PostList } from "./PostList";
import { PostDetail } from "./PostDetail";
import { NewPost } from "./NewPost";

// 路由切换：?thread=id 详情 / ?new=1 发帖 / 无参 列表。
export function ForumInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const thread = searchParams.get("thread");
  const isNew = searchParams.get("new") === "1";

  if (thread) {
    return (
      <PostDetail
        postId={Number(thread)}
        onBack={() => router.push("/ganDaShi")}
      />
    );
  }
  if (isNew) {
    return <NewPost onBack={() => router.push("/ganDaShi")} />;
  }
  return (
    <PostList
      onOpen={(id) => router.push(`/ganDaShi?thread=${id}`)}
      onNew={() => router.push("/ganDaShi?new=1")}
    />
  );
}
