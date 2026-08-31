import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/shop")({
  component: HelpShopPage,
  head: () => ({
    meta: [
      { title: "Tibo Shop — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Ajuda sobre compras, vendas, produtos, lojas e recursos comerciais do Tibo Shop.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpShopPage() {
  return (
    <HelpArticle
      title="Tibo Shop"
      relatedArticles={[
        { title: "Tibo Business", path: "/help/business" },
        { title: "Tibo Ads", path: "/help/ads" },
        { title: "Privacidade e segurança", path: "/help/security" },
      ]}
    >
      <p>
        O Tibo Shop é o espaço destinado a recursos de
        comércio dentro do ecossistema Tibo, permitindo que
        vendedores apresentem produtos, serviços ou outros
        itens permitidos pela plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Compras
      </h2>

      <p>
        Antes de realizar uma compra, confira as informações
        fornecidas pelo vendedor, incluindo descrição, preço,
        condições e eventuais informações de entrega.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Vendedores
      </h2>

      <p>
        Vendedores são responsáveis pela legitimidade das
        informações fornecidas, pelos produtos ou serviços
        oferecidos e pelo cumprimento das obrigações legais
        aplicáveis às suas atividades.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Produtos e serviços
      </h2>

      <p>
        Somente produtos e serviços permitidos pelas políticas
        do Tibo e pela legislação aplicável poderão ser
        oferecidos na plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Pagamentos
      </h2>

      <p>
        Recursos de pagamento e processamento de pedidos
        deverão utilizar mecanismos disponibilizados ou
        autorizados pelo Tibo. Nunca solicite ou compartilhe
        credenciais de acesso ou códigos de segurança para
        concluir uma compra.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Fraudes e problemas
      </h2>

      <p>
        Suspeitas de fraude, anúncios enganosos, produtos
        proibidos ou comportamentos abusivos devem ser
        denunciados pelos canais disponibilizados pelo Tibo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Segurança
      </h2>

      <p>
        Tenha cuidado com ofertas muito diferentes do esperado,
        pedidos de pagamento fora dos mecanismos oficiais e
        solicitações de informações pessoais ou códigos de
        segurança.
      </p>
    </HelpArticle>
  );
}
