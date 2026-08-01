"use client";

import { useState } from "react";
import { Container } from "@/components/Container";
import { RequirePermission } from "@/components/RequirePermission";
import type { ProcessInstanceType } from "@/types";
import { InstanceListPanel } from "./_components/InstanceListPanel";
import { StartProcessSection } from "./_components/StartProcessSection";

// 申请中心：发起流程（搜索下拉 + 标题对话框）+ 我的流程列表（tab/搜索/分页）。第一版只发标题，无表单数据、无行操作。
export default function ProcessApplicationPage() {
  const [activeTab, setActiveTab] = useState<ProcessInstanceType>("1");
  const [refreshKey, setRefreshKey] = useState(0);

  // 发起/存草稿成功后：刷新列表并切到对应 tab（发起→进行中，草稿→草稿）。
  function handleStarted(kind: "start" | "draft") {
    setRefreshKey((k) => k + 1);
    setActiveTab(kind === "start" ? "1" : "0");
  }

  return (
    <RequirePermission>
      <Container className="py-8 md:py-12">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold">申请中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            选择流程发起申请，或查看我发起的流程。
          </p>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">发起流程</h2>
          <StartProcessSection onStarted={handleStarted} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">我的流程</h2>
          <InstanceListPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            refreshKey={refreshKey}
          />
        </section>
      </Container>
    </RequirePermission>
  );
}
