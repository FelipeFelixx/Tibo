import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TiboLogo } from "@/components/brand/tibo-logo";
import { Languages, ShieldCheck, Users, Video, BriefcaseBusiness } from "lucide-react";
import { LOCALES, useI18n } from "@/i18n";

const TERMS_VERSION = "2026-08-16";
const PRIVACY_VERSION = "2026-08-16";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Tibo — Conecte-se, crie e descubra" },
      { name: "description", content: "Entre no Tibo ou crie sua conta para conectar-se a pessoas, comunidades, Clips e negócios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, mode } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || error || !data.session) return;
      navigate({ to: redirect ?? "/app", replace: true });
    });
    return () => { mounted = false; };
  }, [navigate, redirect]);

  const features = useMemo(() => [
    { icon: Video, title: t("landing.clipsTitle", "Clips"), desc: t("landing.clipsDesc", "Vídeos rápidos para assistir, criar e compartilhar.") },
    { icon: Users, title: t("landing.communityTitle", "Comunidades"), desc: t("landing.communityDesc", "Encontre pessoas e assuntos que combinam com você.") },
    { icon: ShieldCheck, title: t("landing.safetyTitle", "Segurança"), desc: t("landing.safetyDesc", "Ferramentas de privacidade, denúncia e proteção de contas.") },
    { icon: BriefcaseBusiness, title: t("landing.businessTitle", "Tibo Business"), desc: t("landing.businessDesc", "Ferramentas profissionais para empresas e anúncios.") },
  ], [t]);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[130px]" />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-accent/20 blur-[130px]" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link to="/"><TiboLogo /></Link>
        <div className="flex items-center gap-1">
          <Languages className="mr-1 h-4 w-4 text-muted-foreground" />
          {LOCALES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setLocale(item.value)}
              className={`rounded-full px-2.5 py-1 text-xs ${locale === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {item.label === "Português" ? "PT" : item.label === "English" ? "EN" : "ES"}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-16">
        <section className="order-last space-y-7 lg:order-first">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {t("landing.badge", "Tibo — uma nova forma de se conectar")}
            </span>
            <h1 className="mt-5 max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl">
              {t("landing.hero", "Conecte-se. Crie. Descubra.")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t("landing.heroDesc", "Uma rede social para pessoas, comunidades, criadores e empresas — com identidade própria e preparada para crescer no mundo.")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-3 font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>✓ {t("landing.mobile", "Mobile first")}</span>
            <span>✓ {t("landing.multilingual", "Português · English · Español")}</span>
            <span>✓ {t("landing.business", "Business para empresas")}</span>
          </div>
        </section>

        <Card className="order-first mx-auto w-full max-w-md border-border/70 bg-card/90 shadow-2xl backdrop-blur lg:order-last">
          <CardHeader>
            <CardTitle>{t("auth.welcome", "Bem-vindo ao Tibo")}</CardTitle>
            <CardDescription>{t("auth.subtitle", "Entre ou crie sua conta para começar.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={mode === "signup" ? "signup" : mode === "forgot" ? "forgot" : "signin"}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">{t("auth.signin", "Entrar")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signup", "Criar conta")}</TabsTrigger>
                <TabsTrigger value="forgot">{t("auth.forgot", "Recuperar")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <SignInForm onDone={() => router.navigate({ to: redirect ?? "/app" })} />
              </TabsContent>
              <TabsContent value="signup"><SignUpForm /></TabsContent>
              <TabsContent value="forgot"><ForgotForm /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const cleanEmail = email.trim();
    if (!cleanEmail) { setLoginError(t("auth.emailRequired", "Digite seu e-mail.")); return; }
    if (!password) { setLoginError(t("auth.passwordRequired", "Digite sua senha.")); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        let message = error.message;
        const lower = error.message.toLowerCase();
        if (lower.includes("invalid login credentials")) message = t("auth.invalidCredentials", "E-mail ou senha incorretos.");
        else if (lower.includes("email not confirmed")) message = t("auth.emailNotConfirmed", "Seu e-mail ainda não foi confirmado.");
        else if (lower.includes("too many requests")) message = t("auth.tooMany", "Muitas tentativas. Aguarde alguns minutos.");
        setLoginError(message); toast.error(message); return;
      }
      if (!data.session) { const message = t("auth.noSession", "Não foi possível iniciar a sessão."); setLoginError(message); toast.error(message); return; }
      toast.success(t("auth.welcomeBack", "Bem-vindo de volta!")); onDone();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.loginFailed", "Não foi possível entrar.");
      setLoginError(message); toast.error(message);
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <Field id="signin-email" label={t("auth.email", "E-mail")} value={email} onChange={setEmail} type="email" autoComplete="email" disabled={loading} />
      <Field id="signin-password" label={t("auth.password", "Senha")} value={password} onChange={setPassword} type="password" autoComplete="current-password" disabled={loading} />
      {loginError && <ErrorBox message={loginError} />}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? t("auth.signingIn", "Entrando…") : t("auth.signin", "Entrar")}</Button>
    </form>
  );
}

function SignUpForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [nome, setNome] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  function ageAtLeast13(date: string) {
    if (!date) return false;
    const dob = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 13;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");

    if (!ageAtLeast13(birthDate)) {
      const message = t("auth.ageBlocked", "O Tibo exige idade mínima de 13 anos nesta versão.");
      setSignupError(message); toast.error(message); return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      const message = t("auth.legalRequired", "Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      setSignupError(message); toast.error(message); return;
    }
    if (password.length < 8) {
      const message = t("auth.passwordMin", "A senha deve ter pelo menos 8 caracteres.");
      setSignupError(message); toast.error(message); return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const cleanUsername = username.trim();
      const cleanNome = nome.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            username: cleanUsername,
            nome: cleanNome,
            data_nascimento: birthDate,
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
            consent_source: "signup_web",
          },
        },
      });

      if (error) { setSignupError(error.message); toast.error(error.message); return; }

      if (!data.session) {
        toast.success(t("auth.accountCreated", "Conta criada! Verifique seu e-mail."));
        navigate({ to: "/verify-email", search: { email: cleanEmail }, replace: true });
      } else {
        toast.success(t("auth.welcomeTibo", "Bem-vindo ao Tibo!"));
        navigate({ to: "/feed", replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.signupFailed", "Não foi possível criar a conta.");
      setSignupError(message); toast.error(message);
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <Field id="su-nome" label={t("auth.name", "Nome")} value={nome} onChange={setNome} disabled={loading} />
      <Field id="su-username" label={t("auth.username", "Usuário")} value={username} onChange={setUsername} pattern="[a-zA-Z0-9_]{3,30}" disabled={loading} />
      <Field id="su-email" label={t("auth.email", "E-mail")} value={email} onChange={setEmail} type="email" autoComplete="email" disabled={loading} />
      <div className="space-y-2">
        <Label htmlFor="su-birth">{t("auth.birthDate", "Data de nascimento")}</Label>
        <Input id="su-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} disabled={loading} required />
        <p className="text-xs text-muted-foreground">{t("auth.teenNote", "Adolescentes podem usar o Tibo a partir de 13 anos, com proteções específicas. Menores de 13 anos não podem criar conta nesta versão.")}</p>
      </div>
      <Field id="su-password" label={t("auth.password", "Senha")} value={password} onChange={setPassword} type="password" autoComplete="new-password" minLength={8} disabled={loading} />

      <div className="space-y-3 rounded-xl border bg-muted/30 p-3 text-sm">
        <label className="flex items-start gap-2">
          <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} />
          <span>{t("auth.acceptTerms", "Li e aceito os")} <Link className="font-medium text-primary underline" to="/termos">{t("auth.terms", "Termos de Uso")}</Link>.</span>
        </label>
        <label className="flex items-start gap-2">
          <Checkbox checked={acceptPrivacy} onCheckedChange={(v) => setAcceptPrivacy(v === true)} />
          <span>{t("auth.acceptPrivacy", "Li e aceito a")} <Link className="font-medium text-primary underline" to="/privacidade">{t("auth.privacy", "Política de Privacidade")}</Link>.</span>
        </label>
      </div>

      {signupError && <ErrorBox message={signupError} />}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? t("auth.creating", "Criando…") : t("auth.create", "Criar conta")}</Button>
    </form>
  );
}

function ForgotForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false); const [errorText, setErrorText] = useState("");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErrorText("");
    if (!email.trim()) { const m=t("auth.emailRequired","Digite seu e-mail."); setErrorText(m); toast.error(m); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) { setErrorText(error.message); toast.error(error.message); return; }
      toast.success(t("auth.resetSent","Enviamos um link de recuperação para seu e-mail."));
    } finally { setLoading(false); }
  }
  return <form onSubmit={handleSubmit} className="space-y-4 pt-4"><Field id="fp-email" label={t("auth.email","E-mail")} value={email} onChange={setEmail} type="email" disabled={loading} />{errorText && <ErrorBox message={errorText} />}<Button type="submit" className="w-full" disabled={loading}>{loading ? t("auth.sending","Enviando…") : t("auth.sendLink","Enviar link")}</Button></form>;
}

function Field({ id, label, value, onChange, type="text", autoComplete, pattern, minLength, disabled }: { id:string; label:string; value:string; onChange:(v:string)=>void; type?:string; autoComplete?:string; pattern?:string; minLength?:number; disabled?:boolean }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={e=>onChange(e.target.value)} type={type} autoComplete={autoComplete} pattern={pattern} minLength={minLength} disabled={disabled} required /></div>;
}
function ErrorBox({ message }: { message:string }) {
  return <div role="alert" aria-live="polite" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</div>;
}
