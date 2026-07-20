// 码表管理相关类型（对应 /code-table/* 与 /code-item/* 接口）。
// 码表 = 字典定义（扁平/树形）；码表项 = 条目（label/value，树形码表的项有 parentId）。
// 注意：id/parentId/tableId 均为 string（后端 String）。

/** 码表（字典定义）。 */
export interface CodeTable {
  /** 码表 id */
  id: string;
  /** 码表编码（唯一标识） */
  code: string;
  /** 码表名称 */
  name: string;
  /** 是否树形："1" 是 / "0" 否 */
  tree: string;
  /** 状态："1" 启用 / "0" 停用 */
  status: string;
  /** 备注 */
  remark: string;
}

/** /code-table/page body。 */
export interface CodeTablePageParam {
  search?: string;
  code?: string;
  name?: string;
  tree?: string;
  status?: string;
  current: number;
  size: number;
}

/** 码表项（条目）。children 由客户端按 parentId 组树时填充（接口返回扁平）。 */
export interface CodeItem {
  /** 码表项 id */
  id: string;
  /** 所属码表 id */
  tableId: string;
  /** 父级 id（树形码表用，根为空串） */
  parentId: string;
  /** 标签 */
  label: string;
  /** 值 */
  value: string;
  /** 排序值 */
  sort: number;
  /** 状态："1" 启用 / "0" 停用 */
  status: string;
  /** 备注 */
  remark: string;
  /** 子项（客户端组树用，接口不返回） */
  children?: CodeItem[];
}

/** /code-item/list body。tableId 指定码表；其余为可选筛选。 */
export interface CodeItemQueryParam {
  tableId?: string;
  parentId?: string;
  label?: string;
  value?: string;
  status?: string;
}

/** /code-item/tree 返回的选择树节点（消费方 cascader 用，管理页不用）。 */
export interface CodeOption {
  label: string;
  value: string;
  children?: CodeOption[];
}
