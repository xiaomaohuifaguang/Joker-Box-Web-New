# hooks — 客户端数据/状态 hooks

命名 `useXxx.ts`，全部 client-only（static export 下运行时数据都在客户端拉）。分三类：

## 认证 / 用户 / 主题（全局）
- `useAuth`：token 登录态，`logout()` = clearToken + clearUser + `window.location.href="/"` 硬导航。
- `useUser`：当前用户缓存。
- `useTheme`：`scheme`(明暗) + `preset`(5 套预设)，localStorage 持久化。
- `useMounted`：跳首帧（token 是 client-only，守卫避免已登录刷新闪 404）。
- `useCredentials`：记住密码（base64）。

## 菜单树（backend-driven 导航）
- `useMenuTree`：按 `menuType`(-1 后台 / -2 前台)拉**后端已按 token 过滤**的菜单树。Module 级缓存 keyed by `menuType + authed + userId`（登录/登出/换用户 → key 变 → 重拉）。
- `useMenuTreeAll`：菜单管理页用，拉全量树 + refresh。

## 业务分页 / 数据（一模块一 hook）
`useOrgTree` `useOrgPage` `useUserPage` `useRolePage` `useApiPathPage` `useCodeTablePage` `useCodeItems` `useWebsiteGroups` `useWebsitePage` `useMailPage` `usePostPage` `useComments` `useDynamicFormPage` `useFileList`

约定：分页 hook 通常收 `{ search, current, size, refreshKey }` 返回 `{ page, loading }`；增删改后父组件 `setRefreshKey(k=>k+1)` 触发重拉。

## 其它
- `use-mobile.ts`(`useIsMobile`)：断点检测，Console sidebar 移动端自动 `Sheet` 抽屉用。
