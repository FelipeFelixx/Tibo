import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/posts")({
  component: HelpPostsPage,
  head: () => ({
    meta: [
      { title: "Publicações — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Saiba como funcionam publicações, fotos, vídeos, comentários, curtidas e compartilhamentos no Tibo.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpPostsPage() {
  return (
    <HelpArticle
      title="Publicações"
      relatedArticles={[
        { title: "Conta e perfil", path: "/help/account" },
        { title: "Privacidade e segurança", path: "/help/security" },
        { title: "Comunidades", path: "/help/community" },
      ]}
    >
      <p>
        As publicações permitem compartilhar conteúdos com
        outras pessoas no Tibo, respeitando as configurações de
        privacidade e as regras da plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Criando uma publicação
      </h2>

      <p>
        Dependendo dos recursos disponíveis na sua conta, uma
        publicação pode incluir texto, imagens, vídeos ou outros
        formatos de conteúdo.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Curtidas e interações
      </h2>

      <p>
        Usuários podem interagir com conteúdos por meio dos
        recursos disponibilizados pelo Tibo. As interações devem
        ser utilizadas de forma legítima e sem abuso automatizado.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Comentários
      </h2>

      <p>
        Comentários devem respeitar as regras da comunidade.
        Conteúdo ofensivo, ameaçador, fraudulento ou ilegal pode
        ser denunciado e analisado.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Compartilhamento e salvamento
      </h2>

      <p>
        Recursos de compartilhamento e salvamento podem permitir
        que conteúdos sejam encontrados ou enviados novamente
        dentro da experiência do Tibo. Sempre respeite os direitos
        do autor e as configurações de privacidade aplicáveis.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Exclusão ou alteração
      </h2>

      <p>
        Quando os recursos correspondentes estiverem disponíveis,
        o autor poderá alterar ou remover suas próprias
        publicações de acordo com as regras e limitações da
        plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Denunciar uma publicação
      </h2>

      <p>
        Caso uma publicação viole as regras do Tibo, utilize o
        mecanismo de denúncia disponível. O conteúdo poderá ser
        analisado e sofrer medidas conforme as políticas
        aplicáveis.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Direitos autorais
      </h2>

      <p>
        Publique somente conteúdos que você tenha autorização
        para utilizar. Violações de direitos autorais poderão
        resultar na remoção do conteúdo e em outras medidas
        previstas nas políticas do Tibo e na legislação aplicável.
      </p>
    </HelpArticle>
  );
}
