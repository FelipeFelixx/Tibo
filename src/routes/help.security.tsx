import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/security")({
  component: HelpSecurityPage,
  head: () => ({
    meta: [
      { title: "Privacidade e Segurança — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Saiba como proteger sua conta, controlar sua privacidade, bloquear usuários e fazer denúncias no Tibo.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpSecurityPage() {
  return (
    <HelpArticle
      title="Privacidade e segurança"
      relatedArticles={[
        { title: "Conta e perfil", path: "/help/account" },
        { title: "Tibo Business", path: "/help/business" },
        { title: "Tibo Ads", path: "/help/ads" },
      ]}
    >
      <p>
        A segurança e a privacidade são partes fundamentais do
        Tibo. Esta seção explica práticas importantes para
        proteger sua conta e como lidar com situações de abuso,
        fraude ou conteúdo inadequado.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Proteja sua conta
      </h2>

      <p>
        Use uma senha forte e exclusiva para o Tibo. Nunca
        compartilhe sua senha, códigos de autenticação ou
        informações de recuperação com outras pessoas.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Tentativas de fraude
      </h2>

      <p>
        Desconfie de mensagens, links ou pessoas que solicitem
        senhas, códigos, pagamentos ou informações confidenciais.
        O Tibo não deve ser utilizado para aplicar golpes ou
        obter informações de outras pessoas de maneira indevida.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Denúncias
      </h2>

      <p>
        Conteúdos ou contas que violem as regras da plataforma
        poderão ser denunciados pelos mecanismos disponíveis no
        Tibo. As denúncias podem ser analisadas conforme as
        políticas aplicáveis.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Bloqueios e restrições
      </h2>

      <p>
        Recursos de bloqueio e outras medidas de segurança podem
        ser utilizados para reduzir interações indesejadas.
        Contas ou conteúdos que apresentem riscos, abusos ou
        violações das regras poderão sofrer limitações.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Privacidade
      </h2>

      <p>
        Informações pessoais devem ser tratadas de acordo com a
        finalidade informada e as políticas aplicáveis. Para
        informações detalhadas sobre tratamento de dados,
        consulte a Política de Privacidade do Tibo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Segurança de adolescentes
      </h2>

      <p>
        Esta versão do Tibo exige idade mínima de 13 anos e
        prevê proteções adicionais para adolescentes. Consulte
        também a página específica de segurança de adolescentes
        para conhecer as regras e orientações aplicáveis.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Conta comprometida
      </h2>

      <p>
        Se você acreditar que sua conta foi comprometida,
        altere imediatamente sua senha e utilize os mecanismos
        oficiais de recuperação e segurança disponíveis.
      </p>
    </HelpArticle>
  );
}
