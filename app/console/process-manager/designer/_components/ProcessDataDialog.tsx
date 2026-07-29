"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import type { Edge, Node } from "@xyflow/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// 「查看数据」弹窗：展示当前画布数据（nodes + edges）的 JSON 快照，可复制。
export function ProcessDataDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: { nodes: Node[]; edges: Edge[] };
}) {
  const json = JSON.stringify(data, null, 2);

  function copy() {
    navigator.clipboard
      .writeText(json)
      .then(() => toast.success("已复制"))
      .catch(() => toast.error("复制失败"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>画布数据</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
          {json}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
            复制
          </Button>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
