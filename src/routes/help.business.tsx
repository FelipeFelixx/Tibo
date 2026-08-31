import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/business")({
  component: HelpBusinessPage,
  head: () => ({
    meta: [
      { title: "Tibo Business — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Conheça o Tibo Business, suas ferramentas comerciais, gestão de empresas e recursos profissionais.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpBusinessPage() {
  return (
    <HelpArticle
      title="Tibo Business"
      relatedArticles={[
        { title: "Tibo Ads", path: "/help/ads" },
        { title: "Conta e perfil", path: "/help/account" },
        { title: "Privacidade e segurança", path: "/help/security" },
      ]}
    >
      <p>
        O Tibo Business é o conjunto de ferramentas criado
        para empresas, marcas e profissionais que desejam
        apresentar seus negócios dentro do Tibo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Recursos para empresas
      </h2>

      <p>
        Empresas poderão criar uma presença comercial,
        apresentar informações do negócio e acessar
        ferramentas para acompanhar seu desempenho.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Estatísticas e informações
      </h2>

      <p>
        As ferramentas comerciais poderão apresentar dados
        como alcance, visualizações, interações e crescimento
        da presença da empresa na plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Responsabilidade das empresas
      </h2>

      <p>
        Empresas são responsáveis pelas informações
        cadastradas, produtos, serviços e conteúdos
        publicados em seus perfis comerciais.
      </p>

      <p>
        O Tibo poderá solicitar verificações, limitar recursos
        ou remover conteúdos que violem políticas da
        plataforma ou leis aplicáveis.
      </p>
    </HelpArticle>
  );
}
