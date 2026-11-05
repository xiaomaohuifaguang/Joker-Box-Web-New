"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { MenuIcon } from "@/components/menuIcons";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useMenuTree } from "@/hooks/useMenuTree";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { flattenMenuLeaves } from "@/lib/nav-match";
import { MENU_TYPE, type MenuType } from "@/types";

// 本组件只在外壳的 useMounted 门控之后渲染，这里读 navigator 不会有水合差异。
function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

function MenuGroup({
  heading,
  menuType,
  onSelect,
}: {
  heading: string;
  menuType: MenuType;
  onSelect: (path: string) => void;
}) {
  const { menu } = useMenuTree(menuType);
  const leaves = flattenMenuLeaves(menu ?? []);
  if (leaves.length === 0) return null;

  return (
    <CommandGroup heading={heading}>
      {leaves.map(({ menu: item, parents }) => (
        <CommandItem
          key={item.path}
          value={[item.name, ...parents, item.description, item.path].filter(Boolean).join(" ")}
          onSelect={() => onSelect(item.path)}
        >
          {item.icon && <MenuIcon name={item.icon} />}
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
          {parents.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">{parents.join(" / ")}</span>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

// 全局搜索：Ctrl/Cmd+K 或顶栏按钮打开，搜索当前用户有权限的页面（菜单树已由后端过滤）。
// 后台菜单只对管理员挂载，避免普通用户多发请求。
export function CommandMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserDisplay();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Mac 只认 Cmd+K：Ctrl+K 在 Mac 编辑器里是「删到行尾」，不抢。
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      if (e.key.toLowerCase() === "k" && mod && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(path: string) {
    setOpen(false);
    // 同 path 带 query 的详情态：与导航 Link 相同的处理（见 hooks/useNavTo）
    if (path === pathname && window.location.search !== "") {
      window.history.pushState(null, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    router.push(path);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden w-44 justify-start gap-2 font-normal text-muted-foreground lg:inline-flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">搜索页面</span>
        <Kbd>{isMac() ? "⌘ K" : "Ctrl K"}</Kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="搜索页面"
        className="text-muted-foreground lg:hidden"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="搜索页面"
        description="输入名称或路径，跳转到对应页面"
      >
        <CommandInput placeholder="输入页面名称或路径" />
        <CommandList>
          <CommandEmpty>没有匹配的页面，换个关键词试试。</CommandEmpty>
          {/* 菜单树在打开后才挂载，首次打开前不产生额外请求 */}
          {open && (
            <>
              <MenuGroup heading="前台" menuType={MENU_TYPE.FRONT} onSelect={go} />
              {user?.admin && (
                <MenuGroup heading="后台" menuType={MENU_TYPE.CONSOLE} onSelect={go} />
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
