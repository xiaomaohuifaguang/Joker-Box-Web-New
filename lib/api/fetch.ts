// 统一 fetch 入口（桌面端试验性改造）。
// Tauri 环境（window.__TAURI_INTERNALS__）且配了绝对后端地址时，走 @tauri-apps/plugin-http
// 的 fetch——Rust 侧 reqwest 发请求，绕过 WebView CORS，后端无需改 CORS。
// web 环境走原生 fetch，行为与之前完全一致。
//
// 对 web 产物零影响的两个保障：
// 1. 插件是动态 import，web 运行时（isTauri()=false）从不加载；
// 2. web 构建不设 NEXT_PUBLIC_API_BASE，第一条件编译期为 false，Tauri 分支可被摇树优化掉。
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
  );
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (process.env.NEXT_PUBLIC_API_BASE && isTauri()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch(input, init);
  }
  return fetch(input, init);
}

// 统一「保存文件」入口：Tauri 的 WebView2 对 blob + <a download> 不可靠，
// 改走系统保存框（plugin-dialog）+ 写文件（plugin-fs）；web 保持原 blob 锚点下载。
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_API_BASE && isTauri()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await save({ defaultPath: filename });
    if (!path) return; // 用户取消保存框
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
