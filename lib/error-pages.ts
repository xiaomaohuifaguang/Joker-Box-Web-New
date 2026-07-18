// 错误页文案（单一来源）：供 ForbiddenPage 与 RequirePermission 共用，
// 避免在多处重复声明 403 文案导致漂移。
export const FORBIDDEN_PROPS = {
  code: "403",
  title: "没有权限",
  message: "你的权限里没有这个页面。",
};
