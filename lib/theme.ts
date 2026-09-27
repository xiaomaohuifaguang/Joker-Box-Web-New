// 主题管理：两个独立维度。
// - scheme（明暗）：通过 <html> 的 .dark 类控制，存 localStorage `theme`。
// - preset（预设）：通过 <html data-theme="..."> 控制，存 localStorage `theme-preset`。
// 每个预设各自定义 light/dark 的颜色 token + 字体；首屏内联脚本同时套上两者防闪烁。
// 预设与 CSS 的对应关系：PRESETS[].id === app/styles/themes/<id>.css 的 data-theme 值（契约见 app/styles/README.md）。

export type Scheme = "light" | "dark";
export type Preset =
  | "joker"
  | "ocean"
  | "sunset"
  | "forest"
  | "minimal"
  | "golden"
  | "arctic"
  | "rose"
  | "tech"
  | "botanical"
  | "midnight";

// 预设元信息：id 对应 CSS data-theme；swatch 是切换器里的固定预览色（各主题 brand）。
export const PRESETS: { id: Preset; name: string; swatch: string }[] = [
  { id: "joker", name: "Joker", swatch: "#c9a227" },
  { id: "ocean", name: "深海", swatch: "#2d8b8b" },
  { id: "sunset", name: "日落大道", swatch: "#e76f51" },
  { id: "forest", name: "森林", swatch: "#2d4a2b" },
  { id: "minimal", name: "极简", swatch: "#36454f" },
  { id: "golden", name: "流金", swatch: "#f4a900" },
  { id: "arctic", name: "冰霜", swatch: "#4a6fa5" },
  { id: "rose", name: "玫瑰", swatch: "#5d2e46" },
  { id: "tech", name: "科技", swatch: "#0066ff" },
  { id: "botanical", name: "花园", swatch: "#4a7c59" },
  { id: "midnight", name: "星河", swatch: "#4a4e8f" },
];

const SCHEME_KEY = "theme";
const PRESET_KEY = "theme-preset";
const THEME_EVENT = "theme_change";

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THEME_EVENT));
}

// --- scheme（明暗）---
export function getScheme(): Scheme {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setScheme(scheme: Scheme): void {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle("dark", scheme === "dark");
  window.localStorage.setItem(SCHEME_KEY, scheme);
  emitChange();
}

export function toggleScheme(): void {
  setScheme(getScheme() === "dark" ? "light" : "dark");
}

// --- preset（预设）---
// 废弃 id（老 localStorage 里的 panshi/hongtai/cyberpunk 等）校验不过 -> 回退默认 joker。
const VALID_PRESETS: readonly Preset[] = PRESETS.map((p) => p.id);

export function getPreset(): Preset {
  if (typeof window === "undefined") return "joker";
  const v = document.documentElement.getAttribute("data-theme");
  return VALID_PRESETS.includes(v as Preset) ? (v as Preset) : "joker";
}

export function setPreset(preset: Preset): void {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-theme", preset);
  window.localStorage.setItem(PRESET_KEY, preset);
  emitChange();
}

// 订阅（scheme 或 preset 变化都触发）。供 useSyncExternalStore 使用。
export function onThemeChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(THEME_EVENT, handler);
  window.addEventListener("storage", handler); // 跨标签页
  return () => {
    window.removeEventListener(THEME_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
