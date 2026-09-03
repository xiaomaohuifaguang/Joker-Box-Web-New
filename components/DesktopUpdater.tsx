"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isTauri } from "@/lib/api/fetch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Update } from "@tauri-apps/plugin-updater";

// 桌面端自动更新（仅生产构建的 Tauri 环境生效；web / tauri dev 均跳过）：
// 启动 3s 后静默拉取 Gitee releases 固定 tag「desktop」下的 latest.json，
// 有新版弹确认框 → 下载（进度 toast）→ 验签安装 → 重启生效。
// 检查失败（断网/仓库不可达）静默忽略，不影响使用；下次启动会再查。
export function DesktopUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const installing = useRef(false);
  // 点「立即更新」后 Update 对象挪到这里，弹窗关闭、下载进度走 toast。
  const updateRef = useRef<Update | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !isTauri()) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { check } = await import("@tauri-apps/plugin-updater");
          const found = await check();
          if (found) setUpdate(found);
        } catch {
          // 静默：更新检查失败不影响正常使用
        }
      })();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleUpdate() {
    const current = update;
    if (!current || installing.current) return;
    installing.current = true;
    updateRef.current = current;
    setUpdate(null); // 关闭弹窗，下载期间不遮挡应用
    let total = 0;
    let downloaded = 0;
    const toastId = toast.loading("正在下载更新…");
    try {
      await current.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            const pct = Math.min(99, Math.round((downloaded / total) * 100));
            toast.loading(`正在下载更新… ${pct}%`, { id: toastId });
          }
        }
      });
    } catch {
      toast.error("更新失败，点击重试或下次启动时再试", { id: toastId });
      installing.current = false;
      setUpdate(updateRef.current); // 恢复弹窗以便重试
      return;
    }
    // Windows 上 downloadAndInstall 默认装完由 NSIS 安装器自动重启（restartAfterInstall），
    // 下面的提示和 relaunch 大概率走不到；relaunch 失败也不能误报「更新失败」。
    toast.success("更新已就绪，正在重启…", { id: toastId });
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      // 忽略：安装器会负责重启
    }
  }

  return (
    <AlertDialog
      open={!!update}
      onOpenChange={(open) => {
        // 点「以后再说」/空白处关闭：本次跳过，下次启动重新提示
        if (!open && !installing.current) setUpdate(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>发现新版本 v{update?.version}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">
            {update?.body || "包含功能更新与问题修复，建议立即更新。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>以后再说</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate}>立即更新</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
