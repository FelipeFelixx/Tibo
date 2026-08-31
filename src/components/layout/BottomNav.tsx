import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Compass, Film, Users, PlusCircle, MessageCircle, User as UserIcon } from "lucide-react";
import { myProfileOptions } from "@/features/profile/queries";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import { useI18n } from "@/i18n";

type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  match: (p: string) => boolean;
  emphasize?: boolean;
};

export function BottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useQuery(myProfileOptions());

  if (!me) return null;

  const items: NavItem[] = [
    {
      key: "home",
      label: t("nav.home", "Início"),
      icon: Home,
      to: "/feed",
      match: (p) => p === "/feed",
    },
    {
      key: "explore",
      label: t("nav.explore", "Explorar"),
      icon: Compass,
      to: "/explorar",
      match: (p) => p.startsWith("/explorar"),
    },
    {
      key: "clips",
      label: t("nav.clips", "Clips"),
      icon: Film,
      to: "/clips",
      match: (p) => p.startsWith("/clips"),
    },
    {
      key: "publish",
      label: t("nav.publish", "Publicar"),
      icon: PlusCircle,
      to: "/publicar",
      match: (p) => p.startsWith("/publicar"),
      emphasize: true,
    },
    {
      key: "communities",
      label: t("nav.communities", "Comunidades"),
      icon: Users,
      to: "/comunidades",
      match: (p) =>
        p.startsWith("/comunidades") || p.startsWith("/c/"),
    },
    {
      key: "messages",
      label: t("nav.messages", "Mensagens"),
      icon: MessageCircle,
      to: "/mensagens",
      match: (p) => p.startsWith("/mensagens"),
    },
    {
      key: "profile",
      label: t("nav.profile", "Perfil"),
      icon: UserIcon,
      to: `/u/${me.username}`,
      match: (p) => p === `/u/${me.username}`,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;

          const inner = (
            <span
              className={cn(
                "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[10px] font-medium transition-colors duration-200 active:scale-95",
                item.emphasize || active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative grid place-items-center rounded-full transition-all duration-200",
                  item.emphasize
                    ? "h-11 w-11 bg-gradient-brand text-brand-foreground shadow-brand"
                    : active
                      ? "h-9 w-9 bg-primary/10"
                      : "h-9 w-9",
                )}
              >
                <Icon
                  className={cn(
                    item.emphasize ? "h-6 w-6" : "h-5 w-5",
                  )}
                  aria-hidden
                />
              </span>

              <span className="max-w-full truncate leading-none">
                {item.label}
              </span>

              {active && !item.emphasize ? (
                <span
                  className="absolute bottom-0 h-0.5 w-6 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </span>
          );

          return (
            <li key={item.key} className="relative flex min-w-0 flex-1">
              <Link
                to={item.to}
                className="relative flex min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
