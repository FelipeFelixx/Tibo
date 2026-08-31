import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  Menu,
  Languages,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import { TiboLogo } from "@/components/brand/tibo-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { myProfileOptions } from "@/features/profile/queries";
import { unreadNotificationsOptions } from "@/features/notifications/queries";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { BackButton } from "./BackButton";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
import { LOCALES, useI18n } from "@/i18n";
import { isPlatformAdmin } from "@/features/admin/business";

export interface TopBarProps {
  title?: ReactNode;
  showBack?: boolean;
  actions?: ReactNode;
  showSearch?: boolean;
}

export function TopBar({
  title,
  showBack = true,
  actions,
  showSearch = true,
}: TopBarProps) {
  const { data: me } = useQuery(myProfileOptions());

  const { data: unread = 0 } = useQuery({
    ...unreadNotificationsOptions(),
    enabled: !!me,
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["platform-admin-access"],
    queryFn: isPlatformAdmin,
    enabled: !!me,
    staleTime: 5 * 60_000,
  });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, locale, setLocale } = useI18n();

  const displayName = me
    ? [me.nome, me.sobrenome].filter(Boolean).join(" ") || me.username
    : "";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
      <div
        className="mx-auto flex max-w-5xl items-center gap-2 px-3 sm:px-4"
        style={{
          paddingTop: "max(0.6rem, env(safe-area-inset-top))",
          paddingBottom: "0.6rem",
        }}
      >
        {showBack ? <BackButton /> : null}

        <Link to="/feed" className="flex shrink-0 items-center">
          <TiboLogo className="scale-90 sm:scale-100" />
        </Link>

        {title ? (
          <div className="ml-2 hidden min-w-0 flex-1 sm:block">
            <h1 className="truncate text-base font-semibold text-foreground">
              {title}
            </h1>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {title ? (
          <div className="min-w-0 flex-1 sm:hidden">
            <h1 className="truncate text-center text-sm font-semibold text-foreground">
              {title}
            </h1>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-1">
          {actions}

          {showSearch ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={t("nav.explore", "Explorar")}
            >
              <Link to="/explorar">
                <Search className="h-5 w-5" />
              </Link>
            </Button>
          ) : null}

          {me ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={t("nav.notifications", "Notificações")}
            >
              <Link to="/notificacoes">
                <Bell className="h-5 w-5" />

                {unread > 0 ? (
                  <span
                    aria-label={`${unread} notificações não lidas`}
                    className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}

          <ThemeToggle />

          {me ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Menu"
                >
                  <Avatar className="h-8 w-8">
                    {me.avatar_url ? (
                      <SignedAvatarImage
                        bucket="avatars"
                        path={me.avatar_url}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-[10px]">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link
                    to="/u/$username"
                    params={{ username: me.username }}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    {t("menu.profile", "Meu perfil")}
                  </Link>
                </DropdownMenuItem>

                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Administração
                    </Link>
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuItem asChild>
                  <Link to="/configuracoes/perfil">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("menu.settings", "Configurações")}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/help">
                    <CircleHelp className="mr-2 h-4 w-4" />
                    {t("menu.help", "Central de Ajuda")}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="font-medium" disabled>
                  <Languages className="mr-2 h-4 w-4" />
                  {t("menu.language", "Idioma")}
                </DropdownMenuItem>

                {LOCALES.map((item) => (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() => setLocale(item.value)}
                    className={
                      locale === item.value ? "bg-accent" : ""
                    }
                  >
                    <span className="mr-2 w-4 text-center">
                      {locale === item.value ? "✓" : ""}
                    </span>
                    {item.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("menu.logout", "Sair")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Entrar"
            >
              <Link to="/auth" search={{ mode: "signin" }}>
                <Menu className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
