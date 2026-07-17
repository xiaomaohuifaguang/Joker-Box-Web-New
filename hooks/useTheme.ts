"use client";

import { useSyncExternalStore } from "react";
import {
  getPreset,
  getScheme,
  onThemeChange,
  setPreset,
  toggleScheme,
} from "@/lib/theme";

// 响应式主题：scheme（明暗）+ preset（预设），供 Header 切换器等使用。
export function useTheme() {
  const scheme = useSyncExternalStore(onThemeChange, getScheme, () => "light");
  const preset = useSyncExternalStore(onThemeChange, getPreset, () => "joker");
  return { scheme, toggleScheme, preset, setPreset };
}
