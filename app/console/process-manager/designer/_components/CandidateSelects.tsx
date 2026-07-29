"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { selectorUserWithInfo } from "@/lib/api/user";
import { getRoleSelector } from "@/lib/api/apiPath";
import { getOrgTree } from "@/lib/api/org";
import type { OrgTree, SelectOption, SelectorUser } from "@/types";

// 用户任务候选人选择控件（值均为「id 集合字符串，逗号间隔」；展示名运行时映射，不入库）。
// 下拉面板内联绝对定位（不 portal），点外部收起。

// 逗号串 <-> id 数组（保持顺序、去空）。
function parseIds(s: string | undefined): string[] {
  return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}
function joinIds(ids: string[]): string {
  return ids.join(",");
}

// 通用外壳：触发器（已选 chips + 下拉箭头）+ 内联面板。点外部收起。
function MultiSelectShell({
  placeholder,
  selected,
  onRemove,
  disabled,
  children,
}: {
  placeholder: string;
  /** 已选项 [{id, name}]（用于触发器 chips） */
  selected: { id: string; name: string }[];
  onRemove: (id: string) => void;
  disabled?: boolean;
  /** 面板内容（open 时渲染） */
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={cn(
          "flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selected.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {s.name}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`移除 ${s.name}`}
                  onClick={() => onRemove(s.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))
        )}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border bg-popover shadow-md">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

// ---- 候选用户：远程搜索多选（/user/selectorUserWithInfo，默认 10 条需配 search）----
export function CandidateUsersSelect({
  value,
  names,
  disabled,
  onChange,
}: {
  value: string; // 逗号串
  names: Record<string, string>; // id -> 展示名（运行时映射）
  disabled?: boolean;
  onChange: (ids: string, addedNames: Record<string, string>) => void;
}) {
  const ids = useMemo(() => parseIds(value), [value]);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SelectorUser[]>([]);
  const [loading, setLoading] = useState(false);
  // search 变化时回到加载态（render 期条件 setState；effect 内只在异步回调 setState，见通用坑）。
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setLoading(true);
  }

  // 搜索防抖拉候选（每次输入都查，后端默认 10 条）。
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      selectorUserWithInfo(search)
        .then((list) => !cancelled && setOptions(list))
        .catch(() => !cancelled && setOptions([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  const selectedSet = useMemo(() => new Set(ids), [ids]);

  function toggle(u: SelectorUser, on: boolean) {
    const id = String(u.id);
    const next = on ? [...ids, id] : ids.filter((x) => x !== id);
    onChange(joinIds(next), on ? { [id]: u.nickname || u.username } : {});
  }

  return (
    <MultiSelectShell
      placeholder="搜索并选择用户"
      disabled={disabled}
      selected={ids.map((id) => ({ id, name: names[id] ?? `#${id}` }))}
      onRemove={(id) => onChange(joinIds(ids.filter((x) => x !== id)), {})}
    >
      {() => (
        <div>
          <div className="relative border-b p-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名/昵称"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center gap-1 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 加载中…
              </div>
            ) : options.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">无匹配用户</p>
            ) : (
              options.map((u) => {
                const id = String(u.id);
                const on = selectedSet.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(u, !on)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                  >
                    <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>
                      {on && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{u.nickname || u.username}</span>
                    <span className="text-muted-foreground">{u.username}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </MultiSelectShell>
  );
}

// ---- 候选角色：静态多选（/role/selector 一次拉全）----
export function CandidateRolesSelect({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (ids: string, names: Record<string, string>) => void;
}) {
  const ids = useMemo(() => parseIds(value), [value]);
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRoleSelector()
      .then((list) => !cancelled && setOptions(list))
      .catch(() => !cancelled && setOptions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of options) m[String(o.key)] = o.value;
    return m;
  }, [options]);
  const selectedSet = useMemo(() => new Set(ids), [ids]);

  function toggle(o: SelectOption, on: boolean) {
    const id = String(o.key);
    const next = on ? [...ids, id] : ids.filter((x) => x !== id);
    onChange(joinIds(next), on ? { [id]: o.value } : {});
  }

  return (
    <MultiSelectShell
      placeholder={loading ? "加载中…" : "选择角色"}
      disabled={disabled}
      selected={ids.map((id) => ({ id, name: nameOf[id] ?? `#${id}` }))}
      onRemove={(id) => onChange(joinIds(ids.filter((x) => x !== id)), {})}
    >
      {() => (
        <div className="max-h-48 overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{loading ? "加载中…" : "暂无角色"}</p>
          ) : (
            options.map((o) => {
              const id = String(o.key);
              const on = selectedSet.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(o, !on)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>
                    {on && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.value}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </MultiSelectShell>
  );
}

// ---- 候选部门：树形多选（/org/getOrgTree，父子独立、各级可选，选父只要父 id 不带子）----
export function CandidateDeptsSelect({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (ids: string, names: Record<string, string>) => void;
}) {
  const ids = useMemo(() => parseIds(value), [value]);
  const [tree, setTree] = useState<OrgTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getOrgTree()
      .then((t) => {
        if (cancelled) return;
        setTree(t);
        // 默认展开第一层。
        setExpanded(new Set(t.map((n) => n.id)));
      })
      .catch(() => !cancelled && setTree([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // id -> name 扁平映射（含所有层级，供 chips 显示）。
  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    const walk = (nodes: OrgTree[]) => {
      for (const n of nodes) {
        m[String(n.id)] = n.name;
        if (n.children) walk(n.children);
      }
    };
    walk(tree);
    return m;
  }, [tree]);
  const selectedSet = useMemo(() => new Set(ids.map(Number)), [ids]);

  function toggle(node: OrgTree, on: boolean) {
    const id = String(node.id);
    const next = on ? [...ids, id] : ids.filter((x) => x !== id);
    onChange(joinIds(next), on ? { [id]: node.name } : {});
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNodes(nodes: OrgTree[], depth: number): React.ReactNode {
    return nodes.map((n) => {
      const hasChildren = !!n.children?.length;
      const on = selectedSet.has(n.id);
      const open = expanded.has(n.id);
      return (
        <div key={n.id}>
          <div
            className="flex items-center gap-1 rounded px-1 py-1 text-xs hover:bg-accent"
            style={{ paddingLeft: depth * 14 + 4 }}
          >
            <button
              type="button"
              aria-label={open ? "收起" : "展开"}
              onClick={() => hasChildren && toggleExpand(n.id)}
              className={cn("flex h-4 w-4 items-center justify-center", !hasChildren && "invisible")}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            <Checkbox
              checked={on}
              onCheckedChange={(c) => toggle(n, c === true)}
              aria-label={n.name}
              className="h-3.5 w-3.5"
            />
            <button type="button" onClick={() => toggle(n, !on)} className="min-w-0 flex-1 truncate text-left">
              {n.name}
            </button>
          </div>
          {hasChildren && open && renderNodes(n.children!, depth + 1)}
        </div>
      );
    });
  }

  return (
    <MultiSelectShell
      placeholder={loading ? "加载中…" : "选择部门（可多选）"}
      disabled={disabled}
      selected={ids.map((id) => ({ id, name: nameOf[id] ?? `#${id}` }))}
      onRemove={(id) => onChange(joinIds(ids.filter((x) => x !== id)), {})}
    >
      {() => (
        <div className="max-h-56 overflow-y-auto p-1">
          {tree.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{loading ? "加载中…" : "暂无部门"}</p>
          ) : (
            renderNodes(tree, 0)
          )}
        </div>
      )}
    </MultiSelectShell>
  );
}
