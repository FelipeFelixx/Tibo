import { createFileRoute } from "@tanstack/react-router";
import { HelpArticle } from "@/features/help/components/HelpArticle";

export const Route = createFileRoute("/help/messages")({
  component: HelpMessagesPage,
  head: () => ({
    meta: [
      { title: "Mensagens — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Ajuda sobre mensagens, conversas, privacidade e comunicação entre usuários no Tibo.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpMessagesPage() {
  return (
    <HelpArticle
      title="Mensagens"
      relatedArticles={[
        { title: "Conta e perfil", path: "/help/account" },
        { title: "Privacidade e segurança", path: "/help/security" },
        { title: "Comunidades", path: "/help/community" },
      ]}
    >
      <p>
        A área de mensagens foi criada para permitir comunicação
        privada entre usuários do Tibo, respeitando as regras de
        segurança e privacidade da plataforma.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Conversas privadas
      </h2>

      <p>
        As conversas privadas devem ser acessíveis somente às
        pessoas autorizadas a participar delas. Informações de
        outras conversas não devem ser compartilhadas ou
        acessadas indevidamente.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Segurança
      </h2>

      <p>
        Nunca envie senhas, códigos de autenticação ou outras
        informações altamente confidenciais para outras pessoas
        por mensagens.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Links e arquivos
      </h2>

      <p>
        Tenha cuidado ao abrir links ou arquivos enviados por
        desconhecidos. Um conteúdo aparentemente legítimo pode
        tentar induzir você a fornecer informações ou instalar
        software malicioso.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Abuso e assédio
      </h2>

      <p>
        A utilização das mensagens para ameaças, golpes, assédio,
        perseguição ou outras formas de abuso não é permitida.
        Utilize os mecanismos de denúncia disponíveis quando
        aplicável.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Privacidade
      </h2>

      <p>
        Informações compartilhadas em conversas devem ser tratadas
        com cuidado. Evite enviar dados pessoais desnecessários e
        respeite a privacidade das outras pessoas.
      </p>

      <h2 className="text-xl font-semibold text-foreground">
        Conta comprometida
      </h2>

      <p>
        Se você suspeitar que sua conta foi comprometida, altere
        sua senha e utilize os mecanismos oficiais de recuperação
        e segurança disponíveis no Tibo.
      </p>
    </HelpArticle>
  );
}
