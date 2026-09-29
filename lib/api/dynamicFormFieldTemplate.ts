import { api } from "@/lib/api";
import type {
    DynamicFormFieldTemplate,
    DynamicFormFieldTemplatePageParam,
    Page
} from "@/types";

/** cat_dynamic_form_field_template分页查询 */
export async function queryDynamicFormFieldTemplatePage(
    params: DynamicFormFieldTemplatePageParam,
): Promise<Page<DynamicFormFieldTemplate>> {
    const { data } = await api.post<Page<DynamicFormFieldTemplate>>("/dynamicFormFieldTemplate/queryPage", {
        body: params,
    });
    return data;
}

/** cat_dynamic_form_field_template新增 */
export async function addDynamicFormFieldTemplate(
    dynamicFormFieldTemplate: DynamicFormFieldTemplate
): Promise<void> {
    await api.post<unknown>("/dynamicFormFieldTemplate/add", { body: dynamicFormFieldTemplate });
}

/** cat_dynamic_form_field_template删除 */
export async function removeDynamicFormFieldTemplate(
    dynamicFormFieldTemplate: DynamicFormFieldTemplate
): Promise<void> {
    await api.post<unknown>("/dynamicFormFieldTemplate/remove", { body: dynamicFormFieldTemplate });
}

/** cat_dynamic_form_field_template修改 */
export async function updateDynamicFormFieldTemplate(
    dynamicFormFieldTemplate: DynamicFormFieldTemplate
): Promise<void> {
    await api.post<unknown>("/dynamicFormFieldTemplate/update", { body: dynamicFormFieldTemplate });
}

 /** cat_dynamic_form_field_template获取详情 */
export async function getDynamicFormFieldTemplateInfo(
    dynamicFormFieldTemplate: DynamicFormFieldTemplate
): Promise<DynamicFormFieldTemplate> {
    const { data } = await api.post<DynamicFormFieldTemplate>("/dynamicFormFieldTemplate/info", { body: dynamicFormFieldTemplate });
    return data;
}