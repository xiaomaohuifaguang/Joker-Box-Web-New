
/** cat_dynamic_form_field__group_template */
export interface DynamicFormFieldGroupTemplate {

    /** 字段组模板id */
    id:number;
    /** 标题 */
    title?:string;
    /** 描述 */
    description?:string;
    /** 字段模板集（JSON.stringify 的未分组 DynamicFormField[]；消费侧插入时重新生成 fieldId/sort） */
    fieldsTemplate?:string;
    /** 联动规则（JSON.stringify 的 DynamicFormLinkageRule[]，目标字段须在字段集内） */
    linkageRules?:string;

}

export interface DynamicFormFieldGroupTemplatePageParam {
    search?: string;
    current: number;
    size: number;
}