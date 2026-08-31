import { createFileRoute, Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useI18n } from "@/i18n"
const LAST_UPDATED = "2026-08-16";

export const Route = createFileRoute("/seguranca-adolescentes")({ component: TeenSafetyPage });
function TeenSafetyPage() {
  const { locale } = useI18n();
  const en = locale === "en-US"; const es = locale === "es-BO";
  return <LegalLayout title={en ? "Teen Safety" : es ? "Seguridad para adolescentes" : "Segurança para adolescentes"}>
    <p>{en ? "Tibo allows teens from age 13 in this version and applies additional safety controls. This page is a product baseline, not legal advice." : es ? "Tibo permite adolescentes desde los 13 años en esta versión y aplica controles adicionales. Esta página es una base de producto, no asesoría jurídica." : "O Tibo permite adolescentes a partir de 13 anos nesta versão e aplica controles adicionais. Esta página é uma base de produto, não aconselhamento jurídico."}</p>
    <ul><li>Configurações de privacidade mais protetivas por padrão serão priorizadas para adolescentes.</li><li>Ferramentas de bloquear, silenciar e denunciar ficam disponíveis.</li><li>Publicidade e recomendações devem respeitar regras específicas para menores.</li><li>O Tibo não deve permitir que adultos usem ferramentas da plataforma para exploração, assédio ou contato abusivo com adolescentes.</li><li>Relatos de risco devem ter fluxo de segurança e escalonamento apropriado.</li></ul>
  </LegalLayout>;
}



function LegalLayout({ title, children }: { title:string; children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5"><Link to="/"><span className="font-bold text-xl">Tibo</span></Link><Link className="text-sm underline" to="/auth">Entrar</Link></header><article className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-sm leading-7 text-foreground">
    <p className="text-xs text-muted-foreground">Tibo · versão-base {LAST_UPDATED}</p>{children}
    <div className="border-t pt-5 text-xs text-muted-foreground"><Link className="underline" to="/termos">Termos</Link> · <Link className="underline" to="/privacidade">Privacidade</Link> · <Link className="underline" to="/seguranca-adolescentes">Segurança de adolescentes</Link></div>
  </article></div>;
}
