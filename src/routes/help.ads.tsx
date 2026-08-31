import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/ads")({
  component: HelpAdsPage,
  head: () => ({
    meta: [
      { title: "Tibo Ads — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Saiba como funciona o Tibo Ads, publicidade, campanhas, anúncios, responsabilidades dos anunciantes e políticas da plataforma.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpAdsPage() {
  return (
    <HelpArticle
      title="Tibo Ads"
      relatedArticles={[
        { title: "Tibo Business", path: "/help/business" },
        { title: "Conta e perfil", path: "/help/account" },
        { title: "Privacidade e segurança", path: "/help/security" },
      ]}
    >
      <p>
        O Tibo Ads é a plataforma de publicidade do Tibo,
        criada para ajudar empresas, criadores e negócios a
        divulgarem produtos, serviços e conteúdos dentro da
        plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Como funciona
      </h2>

      <p>
        Os anunciantes poderão criar campanhas, definir
        objetivos, escolher públicos e acompanhar resultados
        de suas divulgações.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Responsabilidade dos anunciantes
      </h2>

      <p>
        Cada anunciante é responsável pelas informações,
        produtos, serviços e conteúdos enviados para análise.
        As informações devem ser verdadeiras, claras e estar
        de acordo com as leis aplicáveis.
      </p>

      <p>
        O Tibo poderá analisar anúncios, limitar campanhas,
        remover conteúdos ou restringir contas quando houver
        suspeita de fraude, abuso, violação de políticas ou
        exigências legais.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Conteúdos proibidos
      </h2>

      <p>
        Não são permitidos anúncios envolvendo fraude,
        golpes, informações enganosas, produtos proibidos,
        violações de direitos ou qualquer conteúdo que possa
        colocar usuários em risco.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Pagamentos e segurança
      </h2>

      <p>
        Recursos de pagamento, cobrança e ferramentas
        comerciais serão disponibilizados com medidas de
        segurança, prevenção contra fraude e transparência
        para anunciantes.
      </p>
    </HelpArticle>
  );
}
