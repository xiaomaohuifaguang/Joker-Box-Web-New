// 前台布局模式：top（顶栏导航）/ side（左侧栏导航，仿后台 app-shell）。
// 存 localStorage `front-layout`；不套首帧内联脚本（布局切换闪烁用 useMounted 门控规避，
// 见 app/(front)/layout.tsx），所以这里只读写 localStorage，不碰 <html> 属性。

export type FrontLayout = "top" | "side";

const LAYOUT_KEY = "front-layout";
const LAYOUT_EVENT = "front_layout_change";

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LAYOUT_EVENT));
}

export function getFrontLayout(): FrontLayout {
  if (typeof window === "undefined") return "top";
  return window.localStorage.getItem(LAYOUT_KEY) === "side" ? "side" : "top";
}

export function setFrontLayout(layout: FrontLayout): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAYOUT_KEY, layout);
  emitChange();
}

export function toggleFrontLayout(): void {
  setFrontLayout(getFrontLayout() === "side" ? "top" : "side");
}

// 订阅布局变化。供 useSyncExternalStore 使用。
export function onFrontLayoutChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(LAYOUT_EVENT, handler);
  window.addEventListener("storage", handler); // 跨标签页
  return () => {
    window.removeEventListener(LAYOUT_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
