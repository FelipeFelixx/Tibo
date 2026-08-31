import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Users, MessageCircle, Zap, Video, BriefcaseBusiness, ShieldCheck, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiboLogo } from "@/components/brand/tibo-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LOCALES, useI18n } from "@/i18n";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { t, locale, setLocale } = useI18n();
  const features = [
    { icon: Users, title: t("landing.communityTitle", "Comunidades"), desc: t("landing.communityDesc", "Espaços vivos para cada interesse.") },
    { icon: MessageCircle, title: t("landing.safetyTitle", "Conversas"), desc: t("landing.safetyDesc", "Converse, compartilhe e controle sua privacidade.") },
    { icon: Video, title: t("landing.clipsTitle", "Clips"), desc: t("landing.clipsDesc", "Vídeos rápidos para assistir, criar e compartilhar.") },
    { icon: BriefcaseBusiness, title: t("landing.businessTitle", "Tibo Business"), desc: t("landing.businessDesc", "Ferramentas profissionais para empresas e anúncios.") },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-accent/25 blur-[140px]" />
      </div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <TiboLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-1">
            <Languages className="h-4 w-4 text-muted-foreground" />
            {LOCALES.map((item) => (
              <button key={item.value} type="button" onClick={() => setLocale(item.value)} className={`rounded-full px-2 py-1 text-[11px] ${locale === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {item.label === "Português" ? "PT" : item.label === "English" ? "EN" : "ES"}
              </button>
            ))}
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth" search={{ mode: "signin" }}>{t("auth.signin", "Entrar")}</Link></Button>
          <Button asChild className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-90"><Link to="/auth" search={{ mode: "signup" }}>{t("auth.signup", "Criar conta")}</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <section className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> {t("landing.badge", "Tibo — uma nova forma de se conectar")}
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] sm:text-6xl md:text-7xl">{t("landing.hero", "Conecte-se. Crie. Descubra.")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t("landing.heroDesc", "Uma rede social para pessoas, comunidades, criadores e empresas — com identidade própria e preparada para crescer no mundo.")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-brand hover:opacity-90"><Link to="/auth" search={{ mode: "signup" }}>{t("landing.start", "Começar agora")}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth" search={{ mode: "signin" }}>{t("auth.signin", "Entrar")}</Link></Button>
          </div>
        </section>
        <section className="mx-auto mt-24 grid max-w-5xl gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition hover:border-primary/40 hover:shadow-brand">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
        <section className="mx-auto mt-8 flex max-w-5xl items-center justify-center gap-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("landing.safetyTitle", "Segurança")}
          <Zap className="ml-2 h-4 w-4 text-primary" /> {t("landing.mobile", "Mobile first")}
        </section>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tibo · <Link className="underline" to="/help">{t("menu.help", "Central de Ajuda")}</Link> · <Link className="underline" to="/termos">{t("auth.terms", "Termos de Uso")}</Link> · <Link className="underline" to="/privacidade">{t("auth.privacy", "Política de Privacidade")}</Link>
      </footer>
    </div>
  );
}
