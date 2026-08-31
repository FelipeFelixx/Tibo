import { createFileRoute, Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useI18n } from "@/i18n"
const LAST_UPDATED = "2026-08-16";

export const Route = createFileRoute("/privacidade")({ component: PrivacyPage });
function PrivacyPage() {
  const { locale } = useI18n();
  const en = locale === "en-US"; const es = locale === "es-BO";
  return <LegalLayout title={en ? "Privacy Policy" : es ? "Política de Privacidad" : "Política de Privacidade"}>
    <p><strong>{en ? "Draft for legal review." : es ? "Borrador para revisión jurídica." : "Documento-base para revisão jurídica."}</strong> {en ? "This policy must be adapted to the laws applicable to each market." : es ? "Esta política debe adaptarse a las leyes aplicables en cada mercado." : "Esta política deve ser adaptada às leis aplicáveis em cada mercado."}</p>
    <h2>1. Dados coletados</h2><p>O Tibo pode tratar dados de cadastro, perfil, conteúdo publicado, relações sociais, mensagens, preferências, registros técnicos, segurança, anúncios e informações comerciais fornecidas no Tibo Business. A coleta deve ser limitada ao necessário para cada finalidade.</p>
    <h2>2. Finalidades</h2><p>Usamos dados para autenticação, funcionamento da rede social, segurança, personalização, mensagens, comunidades, suporte, prevenção de fraude, métricas e, quando permitido, publicidade.</p>
    <h2>3. Crianças e adolescentes</h2><p>O Tibo aplica uma idade mínima de 13 anos nesta versão. Para adolescentes, o tratamento deve observar o melhor interesse, necessidade, transparência e salvaguardas específicas. Para menores de 13 anos, a operação deve usar um fluxo de consentimento parental verificável quando juridicamente necessário antes de coletar dados pessoais.</p>
    <h2>4. Compartilhamento</h2><p>Dados podem ser processados por provedores necessários ao serviço, como autenticação, hospedagem, armazenamento, pagamentos e observabilidade, sob contratos e controles adequados. O Tibo não deve vender dados pessoais.</p>
    <h2>5. Publicidade</h2><p>O Tibo Ads usa critérios de segmentação e métricas conforme as políticas da plataforma e a legislação aplicável. Anúncios devem ser identificados como publicidade.</p>
    <h2>6. Cookies e tecnologias semelhantes</h2><p>Usamos armazenamento local e tecnologias necessárias para manter sessão, idioma, preferências e funcionamento. Tecnologias opcionais devem ser explicadas e, quando exigido, depender de consentimento.</p>
    <h2>7. Direitos</h2><p>Os titulares podem ter direitos de acesso, correção, informação, portabilidade, eliminação e outros previstos na legislação aplicável. O fluxo de atendimento e os prazos serão definidos na versão jurídica final.</p>
    <h2>8. Segurança e retenção</h2><p>Aplicamos autenticação, RLS, controles de acesso, minimização e registros de segurança. Dados devem ser mantidos apenas pelo tempo necessário ou exigido por lei.</p>
    <h2>9. Exclusão da conta</h2><p>O usuário poderá solicitar a exclusão. Alguns registros podem ser mantidos quando houver obrigação legal, prevenção de fraude, segurança ou defesa de direitos.</p>
    <h2>10. Contato</h2><p>O controlador deverá publicar, antes do lançamento, identidade jurídica, endereço e canal oficial de privacidade.</p>
  </LegalLayout>;
}



function LegalLayout({ title, children }: { title:string; children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5"><Link to="/"><span className="font-bold text-xl">Tibo</span></Link><Link className="text-sm underline" to="/auth">Entrar</Link></header><article className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-sm leading-7 text-foreground">
    <p className="text-xs text-muted-foreground">Tibo · versão-base {LAST_UPDATED}</p>{children}
    <div className="border-t pt-5 text-xs text-muted-foreground"><Link className="underline" to="/termos">Termos</Link> · <Link className="underline" to="/privacidade">Privacidade</Link> · <Link className="underline" to="/seguranca-adolescentes">Segurança de adolescentes</Link></div>
  </article></div>;
}
