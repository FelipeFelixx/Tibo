import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/community")({
  component: HelpCommunityPage,
  head: () => ({
    meta: [
      { title: "Comunidades — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Saiba como criar, participar e administrar comunidades no Tibo.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpCommunityPage() {
  return (
    <HelpArticle
      title="Comunidades"
      relatedArticles={[
        { title: "Publicações", path: "/help/posts" },
        { title: "Mensagens", path: "/help/messages" },
        { title: "Privacidade e segurança", path: "/help/security" },
      ]}
    >
      <p>
        As comunidades permitem reunir pessoas em torno de
        interesses, assuntos e objetivos em comum dentro do Tibo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Participando de uma comunidade
      </h2>

      <p>
        Os usuários podem encontrar comunidades de seu interesse
        e participar delas de acordo com as regras e condições
        definidas para cada espaço.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Publicações em comunidades
      </h2>

      <p>
        Conteúdos publicados em comunidades devem respeitar tanto
        as regras gerais do Tibo quanto as regras específicas
        estabelecidas pelos responsáveis pela comunidade.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Administradores e moderadores
      </h2>

      <p>
        Comunidades podem possuir responsáveis por sua
        administração e moderação. Esses responsáveis devem
        utilizar suas permissões de maneira legítima e
        consistente com as políticas do Tibo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Regras da comunidade
      </h2>

      <p>
        Cada comunidade poderá estabelecer regras próprias para
        organizar as interações entre seus participantes. Essas
        regras não podem permitir atividades proibidas pelas
        políticas do Tibo ou pela legislação aplicável.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Denúncias e moderação
      </h2>

      <p>
        Conteúdos ou comportamentos inadequados podem ser
        denunciados pelos mecanismos disponibilizados pelo Tibo.
        Medidas de moderação poderão ser aplicadas após análise.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Segurança
      </h2>

      <p>
        Não compartilhe informações pessoais sensíveis em
        comunidades públicas. Tenha cuidado com links, arquivos,
        ofertas e solicitações de informações feitas por outros
        participantes.
      </p>
    </HelpArticle>
  );
}
