
/** ai供应商 */
export interface AiProvider {

    /** 供应商id */
    id:number;
    /** 供应商名称 */
    name?:string;
    /** 供应商baseurl */
    baseUrl?:string;

}

export interface AiProviderPageParam {
    search?: string;
    current: number;
    size: number;
}