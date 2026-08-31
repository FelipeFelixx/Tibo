import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TiboLogo } from "@/components/brand/tibo-logo";
import { MailCheck } from "lucide-react";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Verifique seu e-mail — Tibo" },
      { name: "description", content: "Confirme seu e-mail para ativar sua conta Tibo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Auto-detect confirmation: if the user opens this tab after clicking the link,
  // or if they confirm elsewhere and return, Supabase fires SIGNED_IN.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION")) {
        toast.success("E-mail confirmado! Bem-vindo ao Tibo.");
        navigate({ to: "/feed", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleResend() {
    if (!email) return toast.error("E-mail não encontrado. Faça o cadastro novamente.");
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    });
    setResending(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um novo e-mail de confirmação.");
    setCooldown(60);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/"><TiboLogo /></Link>
        </div>
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7" />
            </div>
            <CardTitle>Verifique seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação{email ? <> para <strong>{email}</strong></> : null}.
              Abra o e-mail e clique no link para ativar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
              Não encontrou? Verifique a pasta <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
              Assim que confirmar, esta página redireciona automaticamente para sua Home.
            </div>
            <Button onClick={handleResend} disabled={resending || cooldown > 0} className="w-full">
              {resending
                ? "Reenviando..."
                : cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : "Reenviar e-mail"}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/auth" search={{ mode: "signin" }}>Voltar ao login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}