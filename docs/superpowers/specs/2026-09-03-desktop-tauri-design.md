# 桌面端（Tauri 2）试验性改造 — 设计文档

日期：2026-09-03
状态：**试验性 spike，全程不 commit**。失败时整体删除，见「回滚」节。

## 背景与目标

前端是 Next.js 16 静态导出（`output: 'export'` → `out/`），运行时客户端从相对路径 `/joker-box/*` 拉数据（dev 靠 next rewrites，prod 靠 nginx 反代）。目标：把 `out/` 内嵌进 Tauri 2 壳产出 Windows exe（~10MB），验证桌面化可行性。**Web 端是主产物，本改造对 web 运行时/产物必须零影响。**

## 核心障碍与对策

API 走相对路径 `/joker-box`，桌面壳 origin 是 `tauri://localhost`，没有 nginx。对策：

1. **BASE_URL 收敛**：6 处硬编码 `"/joker-box"`（`lib/api/client.ts`、`lib/api/file.ts`、`lib/api/aiChat.ts`、`lib/api/avatar.ts`、`lib/api/dynamicFormFile.ts`、`app/console/form/dynamicForm-manager/_components/useRemoteOptions.ts`）改读 `lib/env.ts` 的 `NEXT_PUBLIC_API_BASE`，默认 `"/joker-box"`（web 行为不变）。桌面打包用 `.env.desktop` 注入绝对地址——**后端地址的唯一修改位置就是 `.env.desktop`**。
2. **fetch 收敛**：新增 `lib/api/fetch.ts` 统一入口，`isTauri()`（`window.__TAURI_INTERNALS__`）为真时**动态 import** `@tauri-apps/plugin-http` 的 fetch（Rust reqwest 实现，绕过 WebView CORS——后端 CORS 改不改都能跑），否则用原生 fetch。动态 import 保证 web 运行时从不加载插件代码；web 构建未设 `NEXT_PUBLIC_API_BASE` 时 Tauri 分支可被摇树优化掉。

## 架构

```
src-tauri/            # 新增，Tauri 壳（配置为主，几乎无手写 Rust）
out/                  # 现有静态产物，作为 frontendDist 内嵌
.env.desktop          # 新增，NEXT_PUBLIC_API_BASE=http://<后端>/joker-box
```

- **开发**：`tauri dev` 的 devUrl 指 `http://localhost:3000`（next dev）。tauri CLI 会给 dev 进程注入 `TAURI_ENV_PLATFORM` → next.config.ts 加载 `.env.desktop` → **dev 窗口里同样走 plugin-http + 绝对地址**（与产物路径一致，dev 即验证生产链路）。注意：此时用浏览器开 localhost:3000 会因原生 fetch 跨域直连后端而 CORS 失败（dev 期间浏览器调试请等 `npm run dev` 单独跑）。Next 16 dev 按项目目录加锁，`tauri dev` 需先关掉手动开的 dev server。
- **打包**：`npm run build` → `tauri build` → `src-tauri/target/release/bundle/nsis/*.exe`。
- Web/nginx 部署完全不受影响，同一套代码双产物。

## 文件上传/下载

- 上传：plugin-http 的 fetch 支持 FormData/multipart，`uploadFile` 逻辑基本不动（**spike 必验项**）。
- 下载：blob + `<a download>` 在 Tauri WebView2 不可靠 → Tauri 分支用 `@tauri-apps/plugin-dialog` 保存框 + `@tauri-apps/plugin-fs` 写文件；web 保持原逻辑。影响 `file.ts` 的 `downloadFile` 和 aiChat 图片下载。

## 认证与持久化

localStorage token 在 Tauri WebView2 默认持久化到应用数据目录，登录态/主题/记住密码零改动。`crypto.randomUUID` 已由 `randomId()` 兜底，自定义协议下安全。

## 窗口与打包

`tauri.conf.json`：标题/默认与最小窗口尺寸/图标。图标源图存 `src-tauri/app-icon.png`（≥1024 方形 PNG），`npx tauri icon src-tauri/app-icon.png` 重新生成全套（会重新产出 android/ios 目录，Windows-only 可删）。生产构建禁 F12/devtools（Cargo 未开 `devtools` feature）+ 禁 WebView2 原生右键菜单（`components/DesktopGuard.tsx`，放行输入域与应用 radix 右键菜单）。

## 环境前置（非 npm，用户自装）

- Rust 工具链：`winget install Rustlang.Rustup`
- VS C++ Build Tools：「使用 C++ 的桌面开发」工作负载
- WebView2 Runtime：Win11 自带

## 阶段划分

- **MVP + 自动更新（已完成）**：壳 + API 收敛 + 上传下载适配 + 出 exe/安装包 + updater（见下节）。
- **阶段二（不做）**：开机自启、托盘。**正式发布前的安全收紧**（试验版宽 scope 可接受）：capabilities 里 fs 收到 `$DOWNLOAD/**`、http scope 收到配置的后端 origin、评估启用 CSP。

## 自动更新（2026-09-03 已实现并实测通过）

- **方案**：tauri-plugin-updater + Gitee Releases 托管（公网可达；GitHub 本网络不通）。固定 tag `desktop` 的 release 只挂 `latest.json`（endpoint 永不变）；每版本独立 tag 的 release 归档 `setup.exe`（latest.json 里按版本指向它；`.sig` 仅本地备份，签名已内联进清单）。
- **签名**：minisign 密钥对 `npx tauri signer generate -w ~/.tauri/joker-box.key`；私钥在构建机本地（不进仓库），公钥在 `tauri.conf.json plugins.updater.pubkey`。换密钥必须同步换公钥，否则旧版无法升级。
- **配置**：`createUpdaterArtifacts: true`（不开不出 `.sig`）；bundler 只认 `TAURI_SIGNING_PRIVATE_KEY`（私钥**内容**，`_PATH` 变量无效）。
- **发版**：改 `tauri.conf.json` 的 `version`（唯一权威版本，脚本自动同步 Cargo.toml——Cargo 必填但应用版本不读它）→ `npm run build:desktop -- "可选的更新说明"`（`scripts/build-desktop.mjs`：同步版本→构建→签名→生成 latest.json）→ Gitee 两步：新建版本 tag 的 release 传 setup.exe；编辑固定 tag `desktop` 替换 latest.json。
- **客户端**：`components/DesktopUpdater.tsx`（生产+Tauri 门控），启动 3s 静默 `check()`，失败静默；有新版 AlertDialog → 下载进度 toast → 验签安装 → plugin-process `relaunch()`。已实测 0.1.0→0.1.1。
- 坑：Windows 图标缓存会让任务栏显示旧图标（`ie4uinit.exe -show` 或重启解决，非打包问题）。

## 执行顺序（spike 优先）

1. **Spike**：最小 `src-tauri/` + plugin-http 打通一个真实接口（登录后 menuTree）+ 验 FormData 上传。
2. Spike 通过 → 铺开 API 收敛、下载适配、打包 exe。
3. Spike 失败 → 删 `src-tauri/`，零残留。

## 回滚

全程不 commit。失败时：`git checkout -- <改动文件>` + 删 `src-tauri/`、`.env.desktop` + `package.json` 摘掉 `@tauri-apps/*` 依赖与 script。

## 风险

- plugin-http 走 Rust 侧请求，**不出现在 WebView devtools Network 面板**（调试用 Rust 日志/devtools console）。
- 后端地址构建时内联，换环境需重新 `build:desktop`（已接受，与现有部署模式一致）。

## Spike 结论（2026-09-03，全部通过）

- ✅ `tauri dev` 窗口渲染、登录、菜单数据加载（plugin-http 绝对地址直连）
- ✅ FormData multipart 上传（码头云盘）、下载（系统保存框）、SSE 流式聊天
- ✅ release exe（22MB）双击运行正常，关掉重开登录态保持
- ✅ web 构建（`npm run build`）不受改动影响

踩过的坑：
- **http 插件 scope 的 URLPattern 不匹配非默认端口**：`http://**` 只匹配 80 端口，必须用 `http://*:*/*`（显式端口通配）。
- Next 16 的 dev server **按项目目录加锁**，同项目不能跑两个实例（换端口也不行）→ `tauri dev` 需独占。
- tauri-build 在 Windows 下要求 `src-tauri/icons/icon.ico` 存在（dev 也要），用 `npx tauri icon <png>` 生成。
- Cargo.toml 若声明 `[lib]` 则必须有 `src/lib.rs`；纯桌面壳删掉 `[lib]` 段只用 `src/main.rs`。

已解决：NSIS 工具链手动布置（经 7890 代理下载，SHA1 与 CLI 内嵌值一致）→ `%LOCALAPPDATA%\tauri\NSIS\`（含 `Plugins\x86-unicode\additional\nsis_tauri_utils.dll`）；`build:desktop` = `tauri build --bundles nsis`，产物 `bundle\nsis\joker-box_0.1.0_x64-setup.exe`（9.6MB）。工具链一次缓存，后续构建离线可用。
另一坑：打包前要关掉运行中的 joker-box.exe，否则 cargo 删不掉旧 exe（os error 5）。

