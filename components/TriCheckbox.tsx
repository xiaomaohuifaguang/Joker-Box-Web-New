import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TriState = "all" | "some" | "none";

// 三态勾选框：all=全选(对勾) / some=部分(横线) / none=空。
// 样式跟随 shadcn checkbox token。shadcn Checkbox 只渲染对勾、无 indeterminate 图标，故自绘。
// 共用于 ApiPathBindingTree（菜单/角色绑定 api）与 MenuCheckboxTree（角色绑菜单）。
export function TriCheckbox({
  state,
  disabled,
  onChange,
  ariaLabel,
}: {
  state: TriState;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "grid size-4 shrink-0 place-content-center rounded-[4px] border border-input shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        state === "all" && "border-primary bg-primary text-primary-foreground",
        state === "some" && "border-primary text-primary",
      )}
    >
      {state === "all" && <Check className="size-3.5" />}
      {state === "some" && <Minus className="size-3.5" />}
    </button>
  );
}

// 计算一组可勾选项的三态（泛型，兼容 string key 与 number id）。
export function triState<T>(keys: T[], selected: Set<T>): TriState {
  if (keys.length === 0) return "none";
  const hit = keys.filter((k) => selected.has(k)).length;
  if (hit === 0) return "none";
  if (hit === keys.length) return "all";
  return "some";
}
