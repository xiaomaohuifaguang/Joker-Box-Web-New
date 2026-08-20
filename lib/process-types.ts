// 流程分类（type）注册表：type=路由段/接口参数，name=展示名（前台标题拼接 + 后台设计器下拉）。
// 目前是静态注册表；将来与后台配置联动时，把这里换成后端拉取即可（仅动本文件）。
// 注意：app/(front)/process/**/[type]/page.tsx 的 generateStaticParams 是 build 期枚举 type，
//   若 type 改由后端下发，那里需在 build 时 fetch 才能产出对应静态 HTML。
export interface ProcessTypeMeta {
  /** 分类标识（路由段 / 接口参数）。 */
  type: string;
  /** 展示名（后台下拉直接显示；前台标题拼接时默认分类除外）。 */
  name: string;
}

// 默认分类 type：前台标题不拼它的 name，后台新建流程默认选中。
export const DEFAULT_PROCESS_TYPE = "default";

export const PROCESS_TYPES: ProcessTypeMeta[] = [
  { type: DEFAULT_PROCESS_TYPE, name: "默认分类" },
  { type: "oa", name: "OA" },
];

// 前台标题前缀：默认分类 / 通用（无 type）不拼名返回 ""；命中返回 name，未知 type 返回 ""。
export function processTypeName(type?: string): string {
  const t = type ?? "";
  if (t === "" || t === DEFAULT_PROCESS_TYPE) return "";
  return PROCESS_TYPES.find((x) => x.type === t)?.name ?? "";
}
