// 代码工厂（/console/code-factory）类型。
// POST /rapidDevelopment/generate?tableName= 返回的 SampleCode：按表名生成的 12 个示例文件
// （Java 后端 6 个 + React 前端 6 个，值均为源码文本）+ 模块 README（markdown）。
export interface SampleCode {
  /** 实体.java */
  entity: string;
  /** mapper接口.java */
  mapper: string;
  /** mapper实现.java（XML） */
  mapperXml: string;
  /** 业务层.java */
  service: string;
  /** 业务层实现类.java */
  impl: string;
  /** 控制层.java */
  controller: string;
  /** react 前端 type.ts */
  types: string;
  /** react 前端类型索引配置文件 */
  typeIndex: string;
  /** react 前端 api.ts */
  api: string;
  /** react 分页 hook */
  usePage: string;
  /** react 前端 新增/修改弹窗 */
  formDialog: string;
  /** react 前端 page.tsx */
  page: string;
  /** 模块 README（markdown 格式） */
  readme: string;
}
