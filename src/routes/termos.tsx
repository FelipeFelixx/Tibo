import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";

const LAST_UPDATED = "2026-08-16";

export const Route = createFileRoute("/termos")({ component: TermsPage });
function TermsPage() {
  const { locale } = useI18n();
  return <LegalLayout title={locale === "en-US" ? "Terms of Use" : locale === "es-BO" ? "Términos de Uso" : "Termos de Uso"}>
    <p><strong>{locale === "en-US" ? "Draft for legal review." : locale === "es-BO" ? "Borrador para revisión jurídica." : "Documento-base para revisão jurídica."}</strong> {locale === "en-US" ? "These terms must be reviewed and adapted by qualified counsel before commercial launch in each jurisdiction." : locale === "es-BO" ? "Estos términos deben ser revisados y adaptados por un profesional jurídico antes del lanzamiento comercial en cada jurisdicción." : "Este documento deve ser revisado e adaptado por profissional jurídico antes do lançamento comercial em cada jurisdição."}</p>
    <h2>1. {locale === "en-US" ? "Account" : locale === "es-BO" ? "Cuenta" : "Conta"}</h2>
    <p>{locale === "en-US" ? "You are responsible for the information you provide, account security and activity performed through your account. Impersonation, fraud, abuse and automated account creation may result in restrictions." : locale === "es-BO" ? "Eres responsable de la información proporcionada, la seguridad de tu cuenta y la actividad realizada desde ella. La suplantación, fraude, abuso y creación automatizada de cuentas pueden generar restricciones." : "Você é responsável pelas informações fornecidas, pela segurança da conta e pelas atividades realizadas por ela. Falsidade, fraude, abuso e criação automatizada de contas podem resultar em restrições."}</p>
    <h2>2. Conteúdo e comunidade</h2>
    <p>O Tibo permite publicar texto, imagem, vídeo, Clips, Stories e outros conteúdos. Não é permitido conteúdo ilegal, ameaçador, fraudulento, discriminatório, de exploração sexual, violação de direitos autorais ou que coloque pessoas em risco. O Tibo poderá remover conteúdo e restringir contas conforme suas regras e procedimentos de moderação.</p>
    <h2>3. Adolescentes e segurança</h2>
    <p>Esta versão exige idade mínima de 13 anos. Contas de adolescentes ficam sujeitas a proteções adicionais e regras específicas. Menores de 13 anos não podem criar conta nesta versão. O fluxo de consentimento parental e os controles específicos por jurisdição devem ser implementados e revisados antes de uma oferta a menores de 13 anos.</p>
    <h2>4. Tibo Business e Tibo Ads</h2>
    <p>Empresas e anunciantes são responsáveis pela legitimidade dos dados comerciais, produtos, serviços, criativos e alegações publicitárias. Campanhas podem exigir verificação, análise, pagamento válido e aprovação. O Tibo pode suspender anúncios ou contas por fraude, cobrança, segurança, violação de políticas ou exigência legal.</p>
    <h2>5. Denúncias, bloqueios e recursos</h2>
    <p>Usuários poderão denunciar conteúdo ou contas. O Tibo poderá analisar, limitar ou remover conteúdo e oferecer mecanismos de contestação quando aplicável.</p>
    <h2>6. Encerramento</h2>
    <p>O usuário pode solicitar a exclusão da conta. O Tibo poderá suspender ou encerrar contas em situações previstas nas regras, observando obrigações legais de retenção quando aplicáveis.</p>
  </LegalLayout>;
}



function LegalLayout({ title, children }: { title:string; children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5"><Link to="/"><span className="font-bold text-xl">Tibo</span></Link><Link className="text-sm underline" to="/auth">Entrar</Link></header><article className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-sm leading-7 text-foreground">
    <p className="text-xs text-muted-foreground">Tibo · versão-base {LAST_UPDATED}</p>{children}
    <div className="border-t pt-5 text-xs text-muted-foreground"><Link className="underline" to="/termos">Termos</Link> · <Link className="underline" to="/privacidade">Privacidade</Link> · <Link className="underline" to="/seguranca-adolescentes">Segurança de adolescentes</Link></div>
  </article></div>;
}
