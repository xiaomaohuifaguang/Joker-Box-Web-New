# form/dynamicFormFieldTemplate — 字段模板管理

基于动态表单设计器的 19 种基础字段，预先设计好字段模板（选项、校验、默认值、远程数据源等全属性），供设计器「从模板插入」复用。

## 约定

- **`fieldTemplate` = `JSON.stringify(完整 DynamicFormField)`**（含 fieldId）。编辑时 `JSON.parse` 原样回填。
- **消费侧 = 设计器字段库「从模板插入」**：`fieldFromTemplate`（`app/console/form/fieldTemplate.ts`，与 `parseFieldTemplate` 一起供两侧共用）剥实例键 id/value + 重新生成 fieldId，sort 由设计器按目标容器字段数补。模板是快照拷贝，插入后与模板无关联。
- **复用设计器资产，不复制**（跨模块 import，先例 = 前台复用 `DynamicFormRenderer`）：
  - `FIELD_REGISTRY` / `FIELD_GROUPS` / `createField`（`dynamicForm-manager/_components/fields/registry`）
  - `FieldConfigPanel`（`dynamicForm-manager/_components/FieldConfigPanel`）——传 `allFields=[field]`、`linkageRules=[]`（模板无联动 → 远程数据源变更的清规则确认不触发；「插入字段引用」下拉排除自身恒显「无其他字段」，只能手输 `${fieldId}`，合理）
- **编辑弹窗**（`DynamicFormFieldTemplateFormDialog`，`sm:max-w-6xl` 三栏）：左=类型列表（切类型 `createField` 重建、保留字段标题）/ 中=预览沙盒（`key=fieldId` 切类型重挂载，本地值不回写）/ 右=FieldConfigPanel。编辑先拉 info 详情再回填；fieldTemplate parse 失败回退默认 INPUT 字段 + toast 警告（不阻塞）。模板 title 必填。
- 列表 `fieldTemplate` 列显示 `{类型label} · {字段title}`（parse 失败显「-」）。

`page.tsx` + `_components/`(DynamicFormFieldTemplateFormDialog)；`hooks/useDynamicFormFieldTemplatePage`、`lib/api/dynamicFormFieldTemplate`、`types/dynamicFormFieldTemplate`。
