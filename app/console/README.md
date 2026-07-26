# app/console — 后台

`layout.tsx` = `<RequireAdmin>` + `SidebarProvider`(Sidebar + SidebarInset)；顶栏 = SidebarTrigger + `ConsoleBreadcrumb`（菜单树+路由算路径链，纯文本）+ 主题预设/明暗切换。有 `loading.tsx`/`error.tsx`。`page.tsx` 是仪表盘（占位）。Sidebar 菜单 backend-driven（`useMenuTree` menuType=-1），折叠态父项点开向右浮层，footer 用户菜单。`_components/`：ConsoleSidebar、ConsoleBreadcrumb。

路由权限：`<RequireAdmin>` 用后台菜单树判断（URL 直进无权限路由 → 404），见 `components/README.md`。

通用约定：分页列表 hook 收 `{search,current,size,refreshKey}`，增删改后 `setRefreshKey(k=>k+1)` 重拉；分页页码 + 省略号；删除走 AlertDialog 二次确认。

## authority/（权限）
- `org-manager/`：机构管理。左机构树（后端虚拟根 id=-1「全部」为第一层单节点）+ 右列表（表格+分页+搜索）。CRUD：新增/编辑（`OrgFormDialog` 父级 Select）、删除（AlertDialog）。`_components/`(OrgListPanel, OrgFormDialog)。
- `user-manager/`：用户管理。左机构树（复用共享 `OrgTreePanel`，选中按 orgId 过滤，虚拟根=全部用户）+ 右列表（面包屑+搜索+角色 Select+重置 / 表格 / 分页）。行操作：编辑（`UserEditDialog` **即时绑定角色与机构**：Badge × 移除 + 下拉添加，无保存按钮）、重置密码、删除。列表面板 `key=selectedId` 切机构重挂载；角色选择器页面级拉取一次。`(UserListPanel, UserEditDialog)`。
- `role-manager/`：角色管理。扁平列表+分页+搜索。行：角色名 / 后台管理（`admin=1` 显 Badge）/ 更新时间 / 操作。新增仅 name（可选**复制权限自** `withRole` 继承源角色 apiPath+菜单权限）；编辑走 save（role{name,admin} + apiPathTree + menuChoose 前后台合并）。编辑弹窗**三 tab 权限编辑器**：apiPath 权限（复用共享 `ApiPathBindingTree`，`roleBind` 预勾选、`whiteList` 禁用）/ 前台菜单 / 后台菜单（`MenuCheckboxTree` tri-state）。删除：软删（有绑定失败 toast 提示改用强删）+ 强制删（级联，destructive）。共享件 `ApiPathBindingTree`/`TriCheckbox`（`components/`）+ `buildApiPathSaveTree`（`lib/apiPathTree.ts`）。
- `_components/OrgTreePanel`：机构树，org-manager / user-manager 共用。

## 其它
- `api-manager/`：API 管理。筛选（搜索+角色 Select+服务/分组级联 `ServerGroupCascader`）+ 表格（名称/路径/服务/分组/白名单 Badge/创建时间/编辑）+ 分页。白名单仅可经编辑弹窗（`ApiPathEditDialog` Switch）修改。`(ServerGroupCascader, ApiPathEditDialog)`。
- `menu-manager/`：菜单管理。前台/后台分段（menuType -2/-1 `ToggleGroup`）+ **树形表格（不分页：菜单量级小、层级是核心结构）**。**签名**：菜单列渲染为真实导航项（`[图标 chip] 名称`，按 `icon` 字段，`MenuIcon` switch 渲染——static-components 见 CLAUDE.md「通用坑」；空则不渲染、无兜底）。**拖拽排序/改挂**（@dnd-kit：拖把手 + `DragOverlay` + 落点指示线；落定后 active 成为 over 的兄弟 = `newParentId=over.parentId`，防环校验，重算受影响兄弟 sort，乐观更新+失败回滚，逐个 update）。新增走 add（仅字段，菜单未建不能绑 api）；编辑走 save（字段 + api 绑定一次性存）。编辑弹窗：图标选择器（`IconPicker`：Dialog 内**内联下拉面板**非 Popover——滚轮被挡见「通用坑」；14 类 ~149 图标 + 搜索 + 清除）+ api 绑定树（`ApiPathBindingTree` 三级 checkbox，`roleBind` 预勾选、`whiteList=1` 禁用）。`menu.icon` 同时供前台 Header / 后台 Sidebar 导航渲染。`(MenuTreeTable, MenuFormDialog, IconPicker)`；`useMenuTreeAll` 按 menuType 拉树+refresh。
- `website-manager/`：网址收藏管理。扁平列表+分页+筛选（search + groupName Select 带计数，分组复用前台 `/website/group` 派生）。**签名**：地址列渲染为可点击外链（mono + 外链图标，无协议补 https://）。分组无实体（`groupName` 是网站字段，自由文本默认"默认"，无分组 CRUD）。CRUD：groupName/url(等宽)/title/description(Textarea)。**编辑直接用行数据调 save，不拉 info**（行数据已全且 info 缺 title）。`(WebsiteFormDialog)`；`useWebsitePage`。
- `mail-manager/`：邮件记录（只读日志，无 CRUD）。列表+分页+搜索。**签名**：详情弹窗把 `content`(HTML) 放**隔离 iframe**（`srcDoc` + `sandbox=""`，不跑脚本、不污染页面）渲染，`variable`(JSON) 美化成 `<pre>`。列表只返回摘要（无 content/variable），详情才含 content+variable。`(MailDetailDialog)`；`useMailPage`。
- `system/code-table/`：码表管理。两视图（`?tableId` 切换，`useSearchParams` + Suspense）：**列表视图**（无 tableId）分页+筛选+CRUD+详情（跳项视图）；**项视图**（`?tableId`）头部（detail 拉码表信息 + 编辑码表 + 返回）+ 码表项表。项表按码表 `tree` 标志**自适应扁平表/树形表**（`CodeItemTreeTable`），@dnd-kit 拖拽排序/改挂（同 menu-manager：active 成为 over 兄弟 = `newParentId=over.parentId`，防环，重算受影响兄弟 sort，乐观更新+回滚，逐个 update）。项 CRUD：label/value(等宽)/parentId（仅树形，排除自身子孙防环）/sort/status/remark。`buildCodeItemTree`（`lib/codeTableTree.ts`）扁平组树。`(CodeTableListPanel, CodeItemsView, CodeItemTreeTable, CodeTableFormDialog, CodeItemFormDialog)`；`useCodeTablePage`/`useCodeItems`。
- `form/dynamicForm-manager/`：动态表单设计器（见同级 README）。
- `form/dynamicForm-instance-manager/`：表单实例管理。两视图（`?instanceId` 切换，`useSearchParams`+Suspense）：**列表**（分页+搜索，`queryDynamicFormInstancePage`；操作列「查看」跳详情）+ **详情**（`getDynamicFormInstanceInfo`，只读预览）。列：表单名称/版本/实例ID/创建/修改时间。详情复用 `DynamicFormRenderer`（新加可选 `disabled` 整表只读）——实例值经字段 `value` 回填+`defaultValue` 兜底，`linkageRules=[]`（接口不返回）。`_components/`(InstanceListPanel, InstanceDetailView)；`useDynamicFormInstancePage`。
- `process-manager/`、`displayBoard/`、`crawler-task-manager/`、`ai/model-manager/`、`system/system-prompt/`：占位。
