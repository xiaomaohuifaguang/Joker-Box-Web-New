import { api } from "@/lib/api";
import type {
    AiChannel,
    AiChannelInput,
    AiChannelModel,
    AiChannelPageParam,
    AiChannelUpdateInput,
    Page
} from "@/types";

/** ai模型渠道分页查询 */
export async function queryAiChannelPage(
    params: AiChannelPageParam,
): Promise<Page<AiChannel>> {
    const { data } = await api.post<Page<AiChannel>>("/ai/channel/queryPage", {
        body: params,
    });
    return data;
}

/** ai模型渠道新增 */
export async function addAiChannel(
    aiChannel: AiChannelInput
): Promise<void> {
    await api.post<unknown>("/ai/channel/add", { body: aiChannel });
}

/** 测试渠道 API KEY 是否可用 */
export async function testAiChannel(
    aiChannel: AiChannelInput
): Promise<boolean> {
    const { data } = await api.post<boolean>("/ai/channel/test", { body: aiChannel });
    return data === true;
}

/** 获取渠道可用模型（当前仅返回 name/model/vision） */
export async function getAiChannelModels(
    aiChannel: AiChannelInput
): Promise<AiChannelModel[]> {
    const { data } = await api.post<AiChannelModel[]>("/ai/channel/models", { body: aiChannel });
    return data;
}

/** ai模型渠道删除 */
export async function removeAiChannel(
    aiChannel: AiChannel
): Promise<void> {
    await api.post<unknown>("/ai/channel/remove", { body: aiChannel });
}

/** ai模型渠道修改 */
export async function updateAiChannel(
    aiChannel: AiChannelUpdateInput
): Promise<void> {
    await api.post<unknown>("/ai/channel/update", { body: aiChannel });
}

 /** ai模型渠道获取详情 */
export async function getAiChannelInfo(
    aiChannel: AiChannel
): Promise<AiChannel> {
    const { data } = await api.post<AiChannel>("/ai/channel/info", { body: aiChannel });
    return data;
}