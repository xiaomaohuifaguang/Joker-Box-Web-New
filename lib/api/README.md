# lib/api — 数据层

所有后端调用的唯一入口。**组件里不写原生 `fetch`**（唯一例外见下 `file.ts`）。

## 约定

- 根路径 `BASE_URL = /joker-box`（`client.ts`）：dev 由 `next.config.ts` `rewrites` 代理、prod 由 nginx 反代，无 `NEXT_PUBLIC_API_URL`。
- 每个文件是一个后端模块的 typed wrapper，返回 `ApiResponse<T>`（结构 `{ code, msg, data }`），**业务错误抛 `ApiError`**——调用方 `destructure .data`、`catch` 时用 `err instanceof ApiError ? err.message : "兜底"`。
- 成功码 `SUCCESS_CODE = 200`（`client.ts`）。
- `api.post/put` 收 `{ body?, params? }`（body → JSON、params → query 自动 encode）；`api.get/delete` 只收 `params?`。
- **token**：`client.ts` 自动附 `Authorization: Bearer <token>`；响应 `code=401` 且请求带了 token → `handleUnauthorized` 清 token+用户（`clearToken` + 动态 import `clearUser` 避免循环依赖）。`handleUnauthorized` 导出供 `file.ts` 复用。

## 传参风格（易踩）

- 多数是 `POST body`。
- 部分是 **POST 却用 query 传参**（如 dynamicForm 的 `deploy`/`stop`/`publishedForms` 传 `formId`）——写新接口时对齐后端，别默认全走 body。
- `file.ts` 例外：**upload 走 multipart、download 走 GET blob+token**，都是直接 `fetch` + `getToken()` + `buildQuery()`，不经 `api.*`。

## 文件 → 后端模块

`client.ts`(请求基建) · `auth`(getToken/register/mailCode) · `menu`(menuTree，前后台导航) · `menuManage` · `org` · `user` · `roleManage` · `apiPath` · `codeTable` · `website`(前台分组) · `websiteManage`(后台 CRUD) · `mail` · `ganDaShi` · `dynamicForm` · `dynamicFormFile`(上传/下载) · `file`(云盘) · `index.ts`(汇出 `api`/`ApiError` 等)

类型在 `types/`（按域分文件）。新增接口：在对应模块文件加 wrapper + 在 `types/` 加请求/响应类型。
