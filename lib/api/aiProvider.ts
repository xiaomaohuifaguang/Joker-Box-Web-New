import { api } from "@/lib/api";
import type {
    AiProvider,
    AiProviderPageParam,
    Page
} from "@/types";

/** ai供应商分页查询 */
export async function queryAiProviderPage(
    params: AiProviderPageParam,
): Promise<Page<AiProvider>> {
    const { data } = await api.post<Page<AiProvider>>("/ai/provider/queryPage", {
        body: params,
    });
    return data;
}

/** ai供应商新增 */
export async function addAiProvider(
    aiProvider: Omit<AiProvider, "id">
): Promise<void> {
    await api.post<unknown>("/ai/provider/add", { body: aiProvider });
}

/** ai供应商删除 */
export async function removeAiProvider(
    aiProvider: AiProvider
): Promise<void> {
    await api.post<unknown>("/ai/provider/remove", { body: aiProvider });
}

/** ai供应商修改 */
export async function updateAiProvider(
    aiProvider: AiProvider
): Promise<void> {
    await api.post<unknown>("/ai/provider/update", { body: aiProvider });
}

 /** ai供应商获取详情 */
export async function getAiProviderInfo(
    aiProvider: AiProvider
): Promise<AiProvider> {
    const { data } = await api.post<AiProvider>("/ai/provider/info", { body: aiProvider });
    return data;
}