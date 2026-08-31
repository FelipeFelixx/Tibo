import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { BusinessReviewDashboard } from "@/features/admin/components/BusinessReviewDashboard";
import { isPlatformAdmin } from "@/features/admin/business";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/negocios")({
  head: () => ({ meta: [{ title: "Tibo Admin — Business" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const allowed = await isPlatformAdmin();
    if (!allowed) throw redirect({ to: "/admin/" });
  },
  component: () => <AppShell title="Tibo Admin · Business" showBack><BusinessReviewDashboard /></AppShell>,
});
