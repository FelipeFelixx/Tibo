import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Building2, CreditCard, Megaphone, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BusinessShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items: { to: "/negocios" | "/negocios?tab=empresa" | "/negocios?tab=campanhas" | "/negocios?tab=faturamento" | "/negocios?tab=configuracoes"; label: string; icon: typeof BarChart3 }[] = [
    { to: "/negocios", label: "Visão geral", icon: BarChart3 },
    { to: "/negocios?tab=empresa", label: "Empresa", icon: Building2 },
    { to: "/negocios?tab=campanhas", label: "Tibo Ads", icon: Megaphone },
    { to: "/negocios?tab=faturamento", label: "Faturamento", icon: CreditCard },
    { to: "/negocios?tab=configuracoes", label: "Configurações", icon: Settings },
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/feed" className="rounded-lg p-2 hover:bg-muted" aria-label="Voltar ao Tibo Social">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tibo</div>
              <div className="text-lg font-bold">Business</div>
            </div>
          </div>
          <Link to="/feed" className="text-sm font-medium text-muted-foreground hover:text-foreground">Voltar ao Social</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border bg-card p-2 lg:sticky lg:top-24">
          <nav className="grid gap-1">
            {items.map(({ to, label, icon: Icon }) => {
              const active = pathname === "/negocios" && to === "/negocios";
              return (
                <Link key={label} to={to} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted", active && "bg-primary/10 text-primary")}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
