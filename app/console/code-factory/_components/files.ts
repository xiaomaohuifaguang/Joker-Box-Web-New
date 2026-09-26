import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { xml } from "@codemirror/lang-xml";
import type { Extension } from "@codemirror/state";
import type { SampleCode } from "@/types";

// SampleCode 各字段的展示元数据。静态表——tab/文件清单/编辑器语言都从这里取，
// 不在渲染期动态拼（react-hooks/static-components 坑）。语言扩展实例可跨组件共享。
// 顺序按依赖/阅读顺序：后端 数据层→接口层；前端 类型→数据层→页面（page 组合所有，放最后）。

export type SampleCodeKey = keyof SampleCode;

export interface SampleFileMeta {
  key: SampleCodeKey;
  /** tab/清单显示的语义名 */
  label: string;
  /** 工具条显示的文件名 */
  filename: string;
  group: "backend" | "frontend" | "doc";
  /** markdown 说明类内容：预览渲染 md（AiMarkdown）而非 CodeMirror */
  markdown?: boolean;
  extension?: Extension;
}

const javaExt = java();
const xmlExt = xml();
const tsxExt = javascript({ typescript: true, jsx: true });

export const SAMPLE_FILES: SampleFileMeta[] = [
  { key: "entity", label: "实体", filename: "Entity.java", group: "backend", extension: javaExt },
  { key: "mapper", label: "Mapper", filename: "Mapper.java", group: "backend", extension: javaExt },
  { key: "mapperXml", label: "Mapper XML", filename: "Mapper.xml", group: "backend", extension: xmlExt },
  { key: "service", label: "Service", filename: "Service.java", group: "backend", extension: javaExt },
  { key: "impl", label: "Service Impl", filename: "ServiceImpl.java", group: "backend", extension: javaExt },
  { key: "controller", label: "Controller", filename: "Controller.java", group: "backend", extension: javaExt },
  { key: "types", label: "types.ts", filename: "types.ts", group: "frontend", extension: tsxExt },
  { key: "typeIndex", label: "index.ts", filename: "types/index.ts", group: "frontend", extension: tsxExt },
  { key: "api", label: "api.ts", filename: "api.ts", group: "frontend", extension: tsxExt },
  { key: "usePage", label: "useXxxPage", filename: "useXxxPage.ts", group: "frontend", extension: tsxExt },
  { key: "formDialog", label: "FormDialog", filename: "FormDialog.tsx", group: "frontend", extension: tsxExt },
  { key: "page", label: "page.tsx", filename: "page.tsx", group: "frontend", extension: tsxExt },
  { key: "readme", label: "README", filename: "README.md", group: "doc", markdown: true },
];

export const SAMPLE_FILE_MAP = Object.fromEntries(
  SAMPLE_FILES.map((f) => [f.key, f]),
) as Record<SampleCodeKey, SampleFileMeta>;
