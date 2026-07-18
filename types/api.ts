// 后端统一响应格式（对应 Java 的 Result<T> / R<T>）。
// 后端所有接口都返回这个结构；客户端在 lib/api/client.ts 解包，
// 成功时返回整个 body（ApiResponse<T>），失败（code !== 成功码）时抛 ApiError(code, msg)。
// 调用方解构 .data 取数据、.msg 取消息。
export interface ApiResponse<T> {
  /** 业务状态码 */
  code: number;
  /** 响应数据 */
  data: T;
  /** 响应消息 */
  msg: string;
  /** 时间戳（毫秒） */
  timestamp: number;
}

// 分页响应（对应后端 Page<T>）。
export interface Page<T> {
  /** 记录 */
  records: T[];
  /** 总数 */
  total: number;
  /** 页大小 */
  size: number;
  /** 当前页码 */
  current: number;
}
