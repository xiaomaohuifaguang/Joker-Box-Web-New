"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { uploadAvatar } from "@/lib/api/avatar";
import { useUser } from "@/hooks/useUser";
import { UserAvatar } from "@/components/UserAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MAX_SIZE = 5 * 1024 * 1024;

// 头像上传：点选 → 本地预览 → 确认上传（不裁剪）。前端预检仅 image/* 且 ≤5MB。
// 悬停显示相机遮罩；选中文件后切预览（带「预览」角标）+ 确认/取消。
// 成功后 uploadAvatar 内部广播 avatar_change，Header/后台/本页所有 UserAvatar 实例自动刷新。
export function AvatarUpload() {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 本地预览 objectURL，随 file 变化重建，卸载/换图时 revoke
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!user) return null;
  const initials = (user.nickname || user.username || "?")
    .slice(0, 2)
    .toUpperCase();

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // 允许重选同一文件
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("图片不能超过 5MB");
      return;
    }
    setFile(f);
  }

  async function handleConfirm() {
    if (!file) return;
    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("头像已更新");
      setFile(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="更换头像"
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {preview ? (
          <Avatar className="h-24 w-24 ring-2 ring-brand ring-offset-2 ring-offset-background">
            <AvatarImage src={preview} alt="新头像预览" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        ) : (
          <UserAvatar
            userId={user.userId}
            initials={initials}
            className="h-24 w-24 ring-2 ring-border ring-offset-2 ring-offset-background transition-[box-shadow] group-hover:ring-brand"
          />
        )}
        {/* 悬停遮罩：相机图标提示可点击 */}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6 text-background" />
        </span>
        {preview && (
          <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 text-[10px]">
            预览
          </Badge>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePick}
      />
      {file ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            已选择新头像，确认后生效。
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={uploading}
            >
              {uploading ? "上传中…" : "确认上传"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              取消
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">点击头像更换</p>
          <p className="text-sm text-muted-foreground">
            支持 JPG、PNG 等图片格式，不超过 5MB。
          </p>
        </div>
      )}
    </div>
  );
}
