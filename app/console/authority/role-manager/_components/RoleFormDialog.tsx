"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addRole, getRoleApiPathTree, getRoleMenuChoose, saveRole } from "@/lib/api/roleManage";
import { getMenuTreeAll } from "@/lib/api/menuManage";
import { ApiError } from "@/lib/api";
import { buildApiPathSaveTree } from "@/lib/apiPathTree";
import { MENU_TYPE, apiPathKey } from "@/types";
import type { MenuApiPathServer, MenuNode, RoleRecord } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiPathBindingTree } from "@/components/ApiPathBindingTree";
import { MenuCheckboxTree } from "./MenuCheckboxTree";

type Tab = "api" | "front" | "console";

// 新增 / 编辑角色。editing 非 null 时为编辑（加载并保存 apiPath + 菜单权限）。
// 新增走 /role/add（仅 name，可选复制源 withRole）；编辑走 /role/save（role + apiPathTree + menuChoose 前后台合并）。
// roles 供新增时"复制权限自"选择（页面级拉取一次，避免弹窗重挂载重复请求）。
export function RoleFormDialog({
  open,
  onOpenChange,
  editing,
  roles,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoleRecord | null;
  roles: RoleRecord[];
  onSuccess: () => void;
}) {
  const isEdit = !!editing;
  const [name, setName] = useState("");
  const [admin, setAdmin] = useState("0");
  const [withRole, setWithRole] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // 编辑态：权限数据
  const [loading, setLoading] = useState(false);
  const [apiTree, setApiTree] = useState<MenuApiPathServer[] | null>(null);
  const [apiSelected, setApiSelected] = useState<Set<string>>(new Set());
  const [frontTree, setFrontTree] = useState<MenuNode[]>([]);
  const [frontSelected, setFrontSelected] = useState<Set<number>>(new Set());
  const [consoleTree, setConsoleTree] = useState<MenuNode[]>([]);
  const [consoleSelected, setConsoleSelected] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<Tab>("api");

  // 打开/换角色时回填字段 + 重置权限（render 期内条件 setState，避免 effect 内 sync setState）。
  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      setTab("api");
      setWithRole(undefined);
      if (editing) {
        setName(editing.name);
        setAdmin(editing.admin);
        setLoading(true);
        setApiTree(null);
        setApiSelected(new Set());
        setFrontTree([]);
        setFrontSelected(new Set());
        setConsoleTree([]);
        setConsoleSelected(new Set());
      } else {
        setName("");
        setAdmin("0");
      }
    }
  }

  // 编辑时并行加载：apiPath 关系树 + 前后台菜单树 + 前后台已选菜单。effect 内只在异步回调 setState。
  useEffect(() => {
    if (!open || !editing) return;
    let cancelled = false;
    Promise.all([
      getRoleApiPathTree(editing.id),
      getMenuTreeAll(MENU_TYPE.FRONT),
      getMenuTreeAll(MENU_TYPE.CONSOLE),
      getRoleMenuChoose(editing.id, MENU_TYPE.FRONT),
      getRoleMenuChoose(editing.id, MENU_TYPE.CONSOLE),
    ])
      .then(([apiT, frontT, consoleT, frontChoose, consoleChoose]) => {
        if (cancelled) return;
        setApiTree(apiT);
        const sel = new Set<string>();
        for (const svc of apiT)
          for (const grp of svc.groups)
            for (const ap of grp.apiPaths)
              if (ap.roleBind) sel.add(apiPathKey(ap.server, ap.path));
        setApiSelected(sel);
        setFrontTree(frontT);
        setConsoleTree(consoleT);
        setFrontSelected(new Set(frontChoose));
        setConsoleSelected(new Set(consoleChoose));
      })
      .catch(() => {
        if (!cancelled) toast.error("加载角色权限失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editing]);

  async function submit() {
    const n = name.trim();
    if (!n) {
      toast.error("请输入角色名称");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await saveRole({
          role: { id: editing.id, name: n, admin },
          apiPathTree: buildApiPathSaveTree(apiTree ?? [], apiSelected),
          menuChoose: [...frontSelected, ...consoleSelected],
        });
        toast.success("已保存");
      } else {
        await addRole(n, withRole);
        toast.success("已新增");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isEdit ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑角色" : "新增角色"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "配置角色名称、后台管理标记与权限。" : "新建一个角色。"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* 字段 */}
          <div className="grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-3">
            <Label className="text-sm text-muted-foreground">角色名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 管理员"
            />

            {isEdit ? (
              <>
                <Label className="text-sm text-muted-foreground">后台管理</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={admin === "1"}
                    onCheckedChange={(c) => setAdmin(c ? "1" : "0")}
                  />
                  <span className="text-xs text-muted-foreground">
                    标记为后台管理的角色可进入后台
                  </span>
                </div>
              </>
            ) : (
              <>
                <Label className="text-sm text-muted-foreground">复制权限自</Label>
                <Select
                  value={withRole === undefined ? "__none" : String(withRole)}
                  onValueChange={(v) =>
                    setWithRole(v === "__none" ? undefined : Number(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="不复制" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">（不复制）</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* 权限（仅编辑）：三 tab - apiPath / 前台菜单 / 后台菜单 */}
          {isEdit && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList>
                  <TabsTrigger value="api">
                    apiPath 权限
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      {apiSelected.size}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="front">
                    前台菜单
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      {frontSelected.size}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="console">
                    后台菜单
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      {consoleSelected.size}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <div className="mt-2 rounded-lg border bg-surface">
                  <div className="max-h-72 overflow-y-auto p-2">
                    {loading ? (
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-6 w-full" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <TabsContent value="api" className="mt-0">
                          <ApiPathBindingTree
                            tree={apiTree}
                            loading={false}
                            selected={apiSelected}
                            onSelectedChange={setApiSelected}
                          />
                        </TabsContent>
                        <TabsContent value="front" className="mt-0">
                          <MenuCheckboxTree
                            tree={frontTree}
                            selected={frontSelected}
                            onSelectedChange={setFrontSelected}
                          />
                        </TabsContent>
                        <TabsContent value="console" className="mt-0">
                          <MenuCheckboxTree
                            tree={consoleTree}
                            selected={consoleSelected}
                            onSelectedChange={setConsoleSelected}
                          />
                        </TabsContent>
                      </>
                    )}
                  </div>
                </div>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
