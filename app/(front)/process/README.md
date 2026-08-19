# app/(front)/process — 流程前台（申请中心 + 审批中心）

流程的用户侧：`application/`（申请中心，我发起的）+ `approval/`（审批中心，待我审批的）。两目录平行，各带通用页 `page.tsx` 和分类页 `[type]/page.tsx`（分类如 `/process/application/oa`，静态导出靠 `generateStaticParams` 枚举 type，新 type 要重新 build）。均 `<RequirePermission>`。

## 视图编排（两目录同一套约定）

state 驱动视图 + **原生 `window.history.pushState` 同步 URL**（可分享/刷新/前进后退），**不用 `router.push`**（静态导出下同 path 仅改 query 的软导航不可靠，见 CLAUDE.md 通用坑）。`useSearchParams` 是权威来源（外部 `<Link>` 互跳/前进后退必更新），内部 `go()` 跳转用 `override` 覆盖层立即生效（pushState 不经 Next 路由、不重渲染）；`popstate` 用 `window.location` 重算兜底。视图 = 判别联合 `View`（`name` + 参数），`parseView`/`viewToUrl` 双向映射 query。

- **申请中心** `ApplicationInner`：`list`（发起区块 + 我的流程列表）/ `start` 发起 / `detail` 查看 / `edit` 草稿编辑 / `handle` 待处理（复用审批中心 `HandleView`，pass 文案改「提交」）。
- **审批中心** `ApprovalInner`：`list` / `detail`，detail 按 `kind` 分 `handle`（待办处理，可编辑表单）/ `claim`（待认领，只读+确认认领）/ `view`（已办，只读）。

## 数据接口（`lib/api/process.ts`，类型见 `types/process.ts`）

- 列表：`useProcessInstancePage` → `POST /processInstance/queryPage`。申请 tab `INSTANCE_TABS`（待处理6/进行中1/全部5/草稿0），审批 tab `APPROVAL_INSTANCE_TABS`（待办2/待认领3/已办4）。
- 详情：`getProcessInstanceInfo(id, taskId?)` → `POST /processInstance/info`（**query 传参**，审批/处理场景带 taskId）。
- 发起定义信息：`getProcessDefinitionStartInfo` → `POST /processDefinition/startInfo`（query 传 processDefinitionId）。
- 动作：`start` / `saveDraft` / `claim` / `pass` / `reject` / `back`，body 均 `ProcessHandleParam`，响应只看 code。

## 共享件（`_components/`，申请/审批跨目录复用，申请侧放 application/_components）

- `ProcessForm.tsx`：流程表单接入。`hasProcessForm` 判空、`seedProcessFormValues` 回填草稿 value、`ProcessFormFields` 把节点**字段权限 permission**（HIDDEN/READONLY/REQUIRED，优先级高于表单设计配置）映射进字段后用共享 `DynamicFormRenderer` 渲染。readOnly=整表只读（查看态）；linkage=是否引入联动（查看默认不引入，可用「按联动显示」开关切）。
- `ProcessWorkHeader.tsx`：详情头部（编号/标题/流程名版本/状态徽标）。
- `NextTaskCandidatePicker.tsx`：下一用户任务候选人选择（审批类型 **7/8/9 上一节点选择**）。仅渲染需选人的节点（type∈{7,8,9} 且有 candidateUsers，候选人后端已给定、只含 id+nickname，不走远程搜索）；每节点一个**选择器**（触发器 + 内联绝对定位下拉面板不 portal、面板带搜索，交互对齐动态表单 `MultiSelectControl`：div role=button + pointerdown 外部收起），7 单选、8/9 多选。值=`Record<nodeId, number[]>`，提交装进 `ProcessHandleParam.nodeCandidateUsersChoose`；`missingChooseNodes()` 校验。**坑**：`nodeId` 是该功能前提（选择器 React key + `nodeCandidateUsersChoose` 的 map key 都用它），后端若不返回会表现为「选项能 hover 但点击无效 + 控制台 duplicate empty key 警告」——选择器 `onChange` 有 `nodeId != null` 守卫会静默吞掉点击。

## 表单 + 下一任务选人的提交/校验约定（Start/Edit/Handle 三视图一致）

- 填表单（`taskForm`/`startForm`）+ 选人（`nextUserTaskInfos` 里 7/8/9）→ 提交 `ProcessHandleParam`。
- 校验时机：**「发起 start / 通过 pass」才强制**——表单必填（`rendererRef.validate()`）+ 7/8/9 选人（`missingChooseNodes`）；**存草稿 saveDraft / 驳回 back / 拒绝 reject 不校验**。
- `nextUserTaskInfos`：startInfo 与 `processName` 同级、info 与 `processDefinitionName` 同级；**仅 7/8/9 返回 candidateUsers**，其它审批类型不返回、前台不展示。

## 各 `_components/`

- 申请：`InstanceListPanel`（tab+搜索+表格+分页；操作列 待处理=处理/草稿=编辑/其他=查看）、`StartProcessSection`（搜索式下拉选已发布流程）、`StartView`（发起）、`EditView`（草稿编辑，body 带 processInstanceId）、`DetailView`（只读详情 + 待认领时「确认认领」）。
- 审批：`ApprovalListPanel`（tab+列表；操作进 handle/claim/view）、`HandleView`（处理：可编辑表单+联动 + 审批操作 pass/reject/back，点按钮弹确认框可填意见；back 仅 backType=choose 需选目标节点）。
