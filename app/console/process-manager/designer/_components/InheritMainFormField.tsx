"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NodeFieldPermissions } from "./NodeFieldPermissions";
import type { ProcessNodeFieldPermission } from "@/types";
import type { ProcessNodeData } from "./nodes";

// 是否继承主表单字段（inheritMainForm，开始/用户任务共用）。
// 主表单=流程「表单绑定」(globalFormBinding) 绑定的表单：勾选则本节点表单在主表单字段上追加。
// 仅流程同时选好了表单+版本（mainFormBound）才可勾选；否则禁用并提示。
// 勾选后下方展开「字段权限」配置（NodeFieldPermissions）：逐字段/批量设置权限，仅收录非默认。
// 取消勾选时连带清掉 fieldPermissions（继承失效，权限配置无意义）。
export function InheritMainFormField({
  value,
  fieldPermissions,
  formId,
  formVersion,
  mainFormBound,
  readOnly,
  onChange,
}: {
  /** 当前勾选态（node.data.inheritMainForm） */
  value: boolean;
  /** 当前字段权限（node.data.fieldPermissions，仅非默认项） */
  fieldPermissions: ProcessNodeFieldPermission[];
  /** 主表单 id（globalFormBinding.formId） */
  formId: string;
  /** 主表单版本（globalFormBinding.formVersion） */
  formVersion: string;
  /** 流程是否已绑定表单+版本（globalFormBinding.formId/formVersion 均非空） */
  mainFormBound: boolean;
  readOnly: boolean;
  onChange: (patch: Partial<ProcessNodeData>) => void;
}) {
  const disabled = readOnly || !mainFormBound;
  return (
    <div className="grid gap-2.5 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="inherit-main-form" className="text-xs">
          继承主表单字段
        </Label>
        <Switch
          id="inherit-main-form"
          checked={value}
          disabled={disabled}
          onCheckedChange={(c) =>
            // 取消勾选：继承失效，连带清掉字段权限配置。
            onChange(c ? { inheritMainForm: true } : { inheritMainForm: false, fieldPermissions: [] })
          }
        />
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {mainFormBound
          ? "勾选后，本节点表单在流程主表单（表单绑定）字段基础上追加。"
          : "需先在「流程配置」选好绑定表单和版本，才能继承主表单字段。"}
      </p>

      {/* 字段权限：勾选继承后显示，配置主表单各字段在本节点的权限。 */}
      {value && mainFormBound && (
        <NodeFieldPermissions
          formId={formId}
          formVersion={formVersion}
          value={fieldPermissions}
          readOnly={readOnly}
          onChange={(next) => onChange({ fieldPermissions: next })}
        />
      )}
    </div>
  );
}
