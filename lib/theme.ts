// 主题管理：两个独立维度。
// - scheme（明暗）：通过 <html> 的 .dark 类控制，存 localStorage `theme`。
// - preset（预设）：通过 <html data-theme="..."> 控制，存 localStorage `theme-preset`。
// 每个预设各自定义 light/dark 的颜色 token + 字体；首屏内联脚本同时套上两者防闪烁。

export type Scheme = "light" | "dark";
export type Preset = "joker" | "panshi" | "hongtai" | "cyberpunk" | "minimal";

// 预设元信息：id 对应 CSS data-theme；swatch 是切换器里的固定预览色（各预设 brand）。
export const PRESETS: { id: Preset; name: string; swatch: string }[] = [
  { id: "joker", name: "Joker", swatch: "#c5302a" },
  { id: "panshi", name: "磐石之信", swatch: "#1e4fd8" },
  { id: "hongtai", name: "鸿泰安康", swatch: "#b01e1e" },
  { id: "cyberpunk", name: "赛博朋克", swatch: "#ff2e97" },
  { id: "minimal", name: "极简科技", swatch: "#2563eb" },
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
const VALID_PRESETS: Preset[] = ["joker", "panshi", "hongtai", "cyberpunk", "minimal"];

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
