
/** cat_dynamic_form_field_template */
export interface DynamicFormFieldTemplate {

    /** 字段模板id */
    id:number;
    /** 标题 */
    title?:string;
    /** 描述 */
    description?:string;
    /** 字段模板（JSON.stringify 的完整 DynamicFormField，含 fieldId；消费侧插入设计器时重新生成 fieldId/sort） */
    fieldTemplate?:string;

}

export interface DynamicFormFieldTemplatePageParam {
    search?: string;
    current: number;
    size: number;
}