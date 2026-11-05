
import type { AiModel } from "./ai-model";

/** ai模型渠道 */
export interface AiChannel {

    /** 渠道id */
    id:number;
    /** 渠道名称 */
    name?:string;
    /** 供应商id */
    providerId?:number;
    /** 自定义baseurl */
    baseUrl?:string;
    /** API KEY */
    apiKey?:string;
    /** 是否自定义渠道 */
    isCustom?:boolean;
    /** 供应商名称 */
    providerName?:string;
    /** 供应商BaseUrl */
    providerBaseUrl?:string;
    /** 渠道模型列表 */
    models?:AiChannelModel[];

}

/** 渠道新增/修改的可编辑字段（详情展示字段不回传） */
export type AiChannelInput = Pick<
    AiChannel,
    "name" | "providerId" | "baseUrl" | "apiKey" | "models"
>;

export type AiChannelUpdateInput = AiChannelInput & Pick<AiChannel, "id">;

/** 渠道可用模型：当前接口仅返回名称、模型标识和图形理解能力 */
export type AiChannelModel = Pick<AiModel, "name" | "model" | "vision">;

export interface AiChannelPageParam {
    search?: string;
    current: number;
    size: number;
}