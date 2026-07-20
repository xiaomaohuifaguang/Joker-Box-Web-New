"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  addUserOrg,
  addUserRole,
  getUserDetail,
  getUserOrgs,
  getUserRoles,
  removeUserOrg,
  removeUserRole,
} from "@/lib/api/user";
import { ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrgTree, SelectOption, UserOrgItem, UserRecord, UserRole } from "@/types";

// 扁平化机构树为 Select 选项（全角空格缩进表示层级），与 OrgFormDialog 一致。
function flattenOrgTree(
  nodes: OrgTree[],
  depth = 0,
  acc: { id: number; label: string }[] = [],
): { id: number; label: string }[] {
  for (const n of nodes) {
    acc.push({ id: n.id, label: `${"　".repeat(depth)}${n.name}` });
    if (n.children?.length) flattenOrgTree(n.children, depth + 1, acc);
  }
  return acc;
}

// 待确认的绑定动作：添加/移除 角色/机构。选中或点 × 先落入 pending，确认后才调接口。
type PendingKind = "addRole" | "removeRole" | "addOrg" | "removeOrg";
type PendingAction = { kind: PendingKind; id: string; name: string };

// 编辑用户：只读基本信息 + 角色/机构绑定（点 × 移除、下拉添加 -> 弹确认框 -> 调接口 + 刷新绑定）。
// tree / roleOptions 由列表面板传入（避免重复拉取）；弹窗只拉用户专属数据（detail/roles/orgs）。
export function UserEditDialog({
  open,
  onOpenChange,
  userId,
  tree,
  roleOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  tree: OrgTree[];
  roleOptions: SelectOption[];
}) {
  const [detail, setDetail] = useState<UserRecord | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [orgs, setOrgs] = useState<UserOrgItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  // 添加 picker 用 key 控制：选后 bump key 重挂载，复位到 placeholder（非受控 Select 无 value 状态）。
  const [rolePickerKey, setRolePickerKey] = useState(0);
  const [orgPickerKey, setOrgPickerKey] = useState(0);
  // 待确认的绑定动作（非空时渲染确认弹窗）。
  const [pending, setPending] = useState<PendingAction | null>(null);

  // 打开/换用户时重置为加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const target = open && userId ? userId : null;
  const [prevTarget, setPrevTarget] = useState<string | null>(null);
  if (prevTarget !== target) {
    setPrevTarget(target);
    if (target) {
      setLoading(true);
      setDetail(null);
      setRoles([]);
      setOrgs([]);
    }
  }

  // 打开时并行拉取用户详情 + 已绑角色 + 已绑机构。
  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    Promise.all([
      getUserDetail(userId),
      getUserRoles(userId),
      getUserOrgs(userId),
    ])
      .then(([d, r, o]) => {
        if (cancelled) return;
        setDetail(d);
        setRoles(r ?? []);
        setOrgs(o ?? []);
      })
      .catch(() => {
        if (!cancelled) return;
        toast.error("加载用户信息失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const availableRoles = useMemo(
    () => roleOptions.filter((r) => !roles.some((b) => String(b.id) === r.key)),
    [roleOptions, roles],
  );
  const orgOptions = useMemo(() => {
    const bound = new Set(orgs.map((o) => o.id));
    return flattenOrgTree(tree).filter((o) => o.id !== -1 && !bound.has(o.id));
  }, [tree, orgs]);

  async function addRole(roleId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await addUserRole(userId, roleId);
      toast.success("已添加角色");
      setRoles(await getUserRoles(userId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "添加失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(roleId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await removeUserRole(userId, roleId);
      toast.success("已移除角色");
      setRoles(await getUserRoles(userId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "移除失败");
    } finally {
      setBusy(false);
    }
  }

  async function addOrg(orgId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await addUserOrg(userId, orgId);
      toast.success("已添加机构");
      setOrgs(await getUserOrgs(userId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "添加失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeOrg(orgId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await removeUserOrg(userId, orgId);
      toast.success("已移除机构");
      setOrgs(await getUserOrgs(userId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "移除失败");
    } finally {
      setBusy(false);
    }
  }

  // 确认弹窗「确定」：清 pending（关弹窗）后按 kind 调对应接口（复用上方四个函数）。
  async function confirmAction() {
    if (!pending) return;
    const { kind, id } = pending;
    setPending(null);
    if (kind === "addRole") await addRole(id);
    else if (kind === "removeRole") await removeRole(id);
    else if (kind === "addOrg") await addOrg(id);
    else await removeOrg(id);
  }

  // 确认弹窗文案：按 pending.kind 推导 标题/描述/按钮文案与样式。
  const isRemove = pending?.kind === "removeRole" || pending?.kind === "removeOrg";
  const targetLabel =
    pending?.kind === "addRole" || pending?.kind === "removeRole" ? "角色" : "机构";
  const verb = isRemove ? "移除" : "添加";
  const userName = detail?.nickname || detail?.username || "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>管理该用户的角色与机构绑定。</DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex flex-col gap-2 py-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* 基本信息（只读） */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                基本信息
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">用户名</dt>
                <dd className="font-medium">{detail.username || "-"}</dd>
                <dt className="text-muted-foreground">昵称</dt>
                <dd>{detail.nickname || "-"}</dd>
                <dt className="text-muted-foreground">性别</dt>
                <dd>{detail.userExtend?.sex || "-"}</dd>
                <dt className="text-muted-foreground">邮箱</dt>
                <dd className="break-all font-mono text-xs">
                  {detail.userExtend?.mail || "-"}
                </dd>
                <dt className="text-muted-foreground">手机号</dt>
                <dd className="font-mono text-xs">
                  {detail.userExtend?.phone || "-"}
                </dd>
                <dt className="text-muted-foreground">创建时间</dt>
                <dd className="font-mono text-xs text-muted-foreground">
                  {detail.createTime}
                </dd>
              </dl>
            </div>

            {/* 角色绑定 */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  角色绑定
                </span>
                {availableRoles.length > 0 && (
                  <Select
                    key={rolePickerKey}
                    onValueChange={(v) => {
                      const r = roleOptions.find((x) => x.key === v);
                      if (!r) return;
                      setRolePickerKey((k) => k + 1);
                      setPending({ kind: "addRole", id: v, name: r.value });
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <Plus className="h-3 w-3" />
                      <SelectValue placeholder="添加角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {roles.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂未绑定角色</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((r) => (
                    <Badge key={r.id} variant="secondary" className="gap-1 pr-1">
                      {r.name}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setPending({
                            kind: "removeRole",
                            id: String(r.id),
                            name: r.name,
                          })
                        }
                        className="flex items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        aria-label={`移除角色 ${r.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 机构绑定 */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  机构绑定
                </span>
                {orgOptions.length > 0 && (
                  <Select
                    key={orgPickerKey}
                    onValueChange={(v) => {
                      const o = orgOptions.find((x) => String(x.id) === v);
                      if (!o) return;
                      setOrgPickerKey((k) => k + 1);
                      setPending({ kind: "addOrg", id: v, name: o.label });
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <Plus className="h-3 w-3" />
                      <SelectValue placeholder="添加机构" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {orgs.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂未绑定机构</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {orgs.map((o) => (
                    <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
                      {o.name}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setPending({
                            kind: "removeOrg",
                            id: String(o.id),
                            name: o.name,
                          })
                        }
                        className="flex items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        aria-label={`移除机构 ${o.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>

        {/* 绑定操作确认弹窗：添加/移除 角色/机构 统一在此渲染 */}
        <AlertDialog
          open={!!pending}
          onOpenChange={(o) => !o && setPending(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{`${verb}${targetLabel}`}</AlertDialogTitle>
              <AlertDialogDescription>
                {isRemove
                  ? `将${verb}已绑定的${targetLabel}「${pending?.name}」。`
                  : `将为用户「${userName}」${verb}${targetLabel}「${pending?.name}」。`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                variant={isRemove ? "destructive" : "default"}
                onClick={confirmAction}
              >
                {verb}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
