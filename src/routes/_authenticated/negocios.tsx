import { createFileRoute } from "@tanstack/react-router";
import { BusinessShell } from "@/features/business/components/BusinessShell";
import { BusinessDashboard } from "@/features/business/components/BusinessDashboard";

export const Route = createFileRoute("/_authenticated/negocios")({
  head: () => ({ meta: [{ title: "Tibo Business" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <BusinessShell><BusinessDashboard /></BusinessShell>
  ),
});
