import { api } from "@/lib/api";
import type {
    DynamicFormFieldGroupTemplate,
    DynamicFormFieldGroupTemplatePageParam,
    Page
} from "@/types";

/** cat_dynamic_form_field__group_template分页查询 */
export async function queryDynamicFormFieldGroupTemplatePage(
    params: DynamicFormFieldGroupTemplatePageParam,
): Promise<Page<DynamicFormFieldGroupTemplate>> {
    const { data } = await api.post<Page<DynamicFormFieldGroupTemplate>>("/dynamicFormFieldGroupTemplate/queryPage", {
        body: params,
    });
    return data;
}

/** cat_dynamic_form_field__group_template新增 */
export async function addDynamicFormFieldGroupTemplate(
    dynamicFormFieldGroupTemplate: DynamicFormFieldGroupTemplate
): Promise<void> {
    await api.post<unknown>("/dynamicFormFieldGroupTemplate/add", { body: dynamicFormFieldGroupTemplate });
}

/** cat_dynamic_form_field__group_template删除 */
export async function removeDynamicFormFieldGroupTemplate(
    dynamicFormFieldGroupTemplate: DynamicFormFieldGroupTemplate
): Promise<void> {
    await api.post<unknown>("/dynamicFormFieldGroupTemplate/remove", { body: dynamicFormFieldGroupTemplate });
}

/** cat_dynamic_form_field__group_template修改 */
export async function updateDynamicFormFieldGroupTemplate(
    dynamicFormFieldGroupTemplate: DynamicFormFieldGroupTemplate
): Promise<void> {
    await api.post<unknown>("/dynamicFormFieldGroupTemplate/update", { body: dynamicFormFieldGroupTemplate });
}

 /** cat_dynamic_form_field__group_template获取详情 */
export async function getDynamicFormFieldGroupTemplateInfo(
    dynamicFormFieldGroupTemplate: DynamicFormFieldGroupTemplate
): Promise<DynamicFormFieldGroupTemplate> {
    const { data } = await api.post<DynamicFormFieldGroupTemplate>("/dynamicFormFieldGroupTemplate/info", { body: dynamicFormFieldGroupTemplate });
    return data;
}