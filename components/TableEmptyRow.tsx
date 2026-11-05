import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

// 表格空状态：说明没有内容，有下一步时通过 description / action 给出。
export function TableEmptyRow({
  colSpan,
  title,
  description,
  action,
}: {
  colSpan: number;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="whitespace-normal py-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">{title}</p>
          {description && <p className="text-caption text-muted-foreground">{description}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}
