import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/account")({
  component: HelpAccountPage,
  head: () => ({
    meta: [
      { title: "Conta e perfil — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Ajuda sobre criação de conta, login, perfil, informações pessoais e gerenciamento da conta no Tibo.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpAccountPage() {
  return (
    <HelpArticle
      title="Conta e perfil"
      relatedArticles={[
        { title: "Privacidade e segurança", path: "/help/security" },
        { title: "Tibo Business", path: "/help/business" },
        { title: "Tibo Ads", path: "/help/ads" },
      ]}
    >
      <p>
        Nesta seção você encontra informações sobre criação,
        acesso e gerenciamento da sua conta e do seu perfil no
        Tibo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Criando uma conta
      </h2>

      <p>
        Para criar uma conta, utilize o fluxo oficial de cadastro
        do Tibo e forneça as informações solicitadas. Os dados
        fornecidos devem ser verdadeiros e atualizados.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Acesso à conta
      </h2>

      <p>
        Utilize seu e-mail e senha cadastrados para entrar.
        Nunca compartilhe sua senha ou códigos de recuperação
        com outras pessoas.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        E-mail e recuperação
      </h2>

      <p>
        Mantenha o endereço de e-mail da conta atualizado e
        protegido. Os mecanismos de recuperação devem ser
        utilizados somente pelo proprietário da conta.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Perfil
      </h2>

      <p>
        O perfil permite apresentar informações públicas que
        você escolher disponibilizar. Evite publicar informações
        pessoais desnecessárias ou dados que possam comprometer
        sua segurança.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Segurança da conta
      </h2>

      <p>
        Se você suspeitar que outra pessoa acessou sua conta,
        altere sua senha e utilize os mecanismos de segurança
        disponíveis. Nunca forneça credenciais a terceiros.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Encerramento da conta
      </h2>

      <p>
        A exclusão ou encerramento da conta deve seguir os
        mecanismos disponibilizados pelo Tibo e poderá estar
        sujeita às obrigações legais de retenção de determinadas
        informações.
      </p>
    </HelpArticle>
  );
}
