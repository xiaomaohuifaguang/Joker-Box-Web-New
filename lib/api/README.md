# lib/api — 数据层

所有后端调用的唯一入口。**组件里不写原生 `fetch`**；multipart / blob / SSE 等 `api.*` 覆盖不了的场景，也统一走本目录 `fetch.ts` 的 `apiFetch`（不直接写 `fetch`）。

## 约定

- 根路径 `env.apiBase`（`lib/env.ts`，读 `NEXT_PUBLIC_API_BASE`，默认 `/joker-box`）：web 下 dev 由 `next.config.ts` `rewrites` 代理、prod 由 nginx 反代；桌面（Tauri）构建由 `.env.desktop` 注入绝对地址（见 `fetch.ts` 头注释）。
- `fetch.ts`：`apiFetch` 是唯一网络入口——Tauri + 绝对地址时动态 import `@tauri-apps/plugin-http`（Rust 侧发请求，绕 WebView CORS），否则原生 fetch；`saveBlob` 统一「保存文件」（Tauri 弹系统保存框 + 写文件，web 走 blob 锚点下载）。web 构建不设 `NEXT_PUBLIC_API_BASE`，Tauri 分支编译期为 false 可被摇掉，web 零影响。
- 每个文件是一个后端模块的 typed wrapper，返回 `ApiResponse<T>`（结构 `{ code, msg, data }`），**业务错误抛 `ApiError`**——调用方 `destructure .data`、`catch` 时用 `err instanceof ApiError ? err.message : "兜底"`。
- 成功码 `SUCCESS_CODE = 200`（`client.ts`）。
- `api.post/put` 收 `{ body?, params? }`（body → JSON、params → query 自动 encode）；`api.get/delete` 只收 `params?`。
- **token**：`client.ts` 自动附 `Authorization: Bearer <token>`；响应 `code=401` 且请求带了 token → `handleUnauthorized` 清 token+用户（`clearToken` + 动态 import `clearUser` 避免循环依赖）。`handleUnauthorized` 导出供 `file.ts` 复用。

## 传参风格（易踩）

- 多数是 `POST body`。
- 部分是 **POST 却用 query 传参**（如 dynamicForm 的 `deploy`/`stop`/`publishedForms` 传 `formId`）——写新接口时对齐后端，别默认全走 body。
- `file.ts` 例外：**upload 走 multipart、download 走 GET blob+token**，都是 `apiFetch` + `getToken()` + `buildQuery()`，不经 `api.*`；下载用 `saveBlob` 保存。
- `aiChat.ts` 流式例外：`chatStream`（SSE）经 `lib/sse.ts` 的 `streamSSE`（内部也是 `apiFetch`）读 `body.getReader()` 解 `data:` 帧（`api.*` 不支持流）；非流式 `chatOnce`/models/sessions/messages 仍走 `api.*`。另外 `fileUpload`（multipart）/`fileDownload`（blob+token）同 `file.ts` 模式走 `apiFetch`/`saveBlob`。

## 文件 → 后端模块

`client.ts`(请求基建) · `fetch.ts`(`apiFetch`/`saveBlob` 统一网络与保存入口，桌面适配) · `auth`(getToken/register/mailCode) · `menu`(menuTree，前后台导航) · `menuManage` · `org` · `user` · `roleManage` · `apiPath` · `codeTable` · `website`(前台分组) · `websiteManage`(后台 CRUD) · `mail` · `ganDaShi` · `dynamicForm` · `dynamicFormFile`(上传/下载) · `process`(流程定义 queryPage/add/save/info/remove/stop/delegateExpressions(服务任务委托表达式下拉)，发布 deploy 走 **query 传参 id**——非 body，见「传参风格」) · `user`(queryPage/CRUD/角色机构绑定/selectorUserWithInfo/selectorInitByIds) · `org`(queryPage/getOrgTree/CRUD/info) · `file`(云盘) · `aiChat`(AI 会话 models/sessions/messages + chat；流式走 `lib/sse.ts`，见「传参风格」) · `index.ts`(汇出 `api`/`ApiError` 等)

类型在 `types/`（按域分文件）。新增接口：在对应模块文件加 wrapper + 在 `types/` 加请求/响应类型。
