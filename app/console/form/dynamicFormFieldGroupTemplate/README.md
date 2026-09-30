# form/dynamicFormFieldGroupTemplate — 字段组合模板管理

一组字段 + 对应联动规则存为一个模板，供设计器一键插入多字段带联动。单次引用后**无关联**（快照拷贝：插入时重新生成 fieldId/sort，改模板不影响已插入表单）。

## 约定

- **`fieldsTemplate` = `JSON.stringify(未分组 DynamicFormField[])`**；**`linkageRules` = `JSON.stringify(DynamicFormLinkageRule[])`**。均不含后端 id/实例 value。回填解析（`fieldsFromTemplate`/`rulesFromTemplate`）**保留原始 fieldId**——同一模板内字段与联动规则（triggerFieldId/targetFieldId/OPTION value）靠 fieldId 互相引用，必须一致。fieldId 仅在插入设计器画布时重生成（`groupFromTemplate`：新 fieldId + `remapLinkageRules` 同步改写规则引用）。单次引用后无关联（快照拷贝）。
- **编辑弹窗**（`DynamicFormFieldGroupTemplateFormDialog`，`sm:max-w-6xl` 三栏）：左=字段类型列表（点类型添加空白字段）+「从模板插入」（单字段模板）；中=画布（`FormCanvas`，`hideUngroupedTitle`——整个集合就是一个、无分组概念）；右=「字段配置|联动规则」两 Tab（`FieldConfigPanel` / `LinkagePanel`）。内部用 `useDesignerState` 挂本地 state（仅 fields/linkageRules，groups 恒空）。**footer「预览」** 复用 `FormPreviewDialog`（`DynamicFormRenderer` 渲染引擎），真实控件改值即联动求值，可交互验证联动规则。
- **复用设计器资产，不复制**：`FormCanvas`/`FieldConfigPanel`/`LinkagePanel`/`TemplatePickerDialog`/`useDesignerState`（跨模块 import，先例 = 前台复用 `DynamicFormRenderer`）。
- 解析助手 `fieldsFromTemplate`/`rulesFromTemplate`/`groupFromTemplate`/`remapLinkageRules`/`parseFieldTemplate` 在 `app/console/form/fieldTemplate.ts`（与单字段模板共用）。

`page.tsx` + `_components/`(DynamicFormFieldGroupTemplateFormDialog)；`hooks/useDynamicFormFieldGroupTemplatePage`、`lib/api/dynamicFormFieldGroupTemplate`、`types/dynamicFormFieldGroupTemplate`。
