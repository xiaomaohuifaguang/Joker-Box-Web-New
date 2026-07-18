// 文件服务相关类型（对应 /file/* 接口）。

export interface FileItem {
  /** 文件唯一 id */
  id: string;
  /** 文件名 */
  filename: string;
  /** 文件类型（contentType，非后缀） */
  contentType: string;
  /** file 文件 / folder 文件夹 */
  type: "file" | "folder";
  /** 父级文件夹 id（根目录为 "0"） */
  parentId: string;
  /** 文件大小（字节） */
  size: number;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** yyyy-MM-dd HH:mm:ss */
  updateTime: string;
}
