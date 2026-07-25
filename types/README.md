# types — 领域类型

API 请求/响应与领域模型类型，**按后端模块分文件**（与 `lib/api/` 一一对应）。TypeScript strict，**避免 `any`**。

- `index.ts` 统一汇出，组件里 `import type { X } from "@/types"`。
- 通用信封：`ApiResponse<T>`（`{ code, msg, data }`）、`Page<T>`（分页 `{ records, total, ... }`）在 `api.ts`。
- 文件 → 域：`api-path` `auth`(在 user.ts) `code-table` `dynamic-form` `file` `ganDaShi` `mail` `menu`(前台导航) `menu-manager`(后台菜单管理) `org` `role-manager` `user-manager` `user` `website`(前台) `website-manager`(后台)。

## 约定

- **后端可能返回 `null` 的字段，排序/比较/渲染前做兜底**：`?? ""` / `?? 0`（尤其 `sort`、`updateTime`、`version`）。
- 可选后端字段标 `?:`（如 `id?` 新增时无、保存时带）；前端-only 字段（如 `clientId`）注释「不参与提交」，保存前剥离。
- 新增接口：在对应域文件加请求/响应类型，并在 `index.ts` 汇出。
