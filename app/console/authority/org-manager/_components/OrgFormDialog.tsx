"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { addOrg, updateOrg } from "@/lib/api/org";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Org, OrgTree } from "@/types";

const schema = z.object({
  parentId: z.number(),
  name: z.string().min(1, "请输入机构名称"),
});
type FormValues = z.infer<typeof schema>;

// 扁平化机构树为 Select 选项（全角空格缩进表示层级）。
function flatten(
  nodes: OrgTree[],
  depth = 0,
  acc: { id: number; label: string }[] = [],
): { id: number; label: string }[] {
  for (const n of nodes) {
    acc.push({ id: n.id, label: `${"　".repeat(depth)}${n.name}` });
    if (n.children?.length) flatten(n.children, depth + 1, acc);
  }
  return acc;
}

// 新增 / 编辑机构。editing 非 null 时为编辑。
export function OrgFormDialog({
  open,
  onOpenChange,
  tree,
  editing,
  defaultParentId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: OrgTree[];
  editing: Org | null;
  defaultParentId: number;
  onSuccess: () => void;
}) {
  const isEdit = !!editing;
  const options = useMemo(() => flatten(tree), [tree]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { parentId: -1, name: "" },
  });

  // 打开时回填：编辑用行数据，新增用 defaultParentId（未选节点时为虚拟根 -1）。
  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({ parentId: editing.parentId, name: editing.name });
    } else {
      form.reset({ parentId: defaultParentId ?? -1, name: "" });
    }
  }, [open, editing, defaultParentId, form]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && editing) {
        await updateOrg({
          id: editing.id,
          parentId: values.parentId,
          name: values.name,
        });
        toast.success("已修改");
      } else {
        await addOrg({ parentId: values.parentId, name: values.name });
        toast.success("已新增");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑机构" : "新增机构"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改机构信息。" : "新建一个机构。"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>父级机构</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择父级" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="-1">（顶级）</SelectItem>
                      {options
                        .filter(
                          (o) =>
                            o.id !== -1 &&
                            !(isEdit && editing && o.id === editing.id),
                        )
                        .map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>机构名称</FormLabel>
                  <FormControl>
                    <Input placeholder="机构名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "提交中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
