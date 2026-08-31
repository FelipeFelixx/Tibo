export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  path: string;
};

export const helpCategories: HelpCategory[] = [
  {
    id: "account",
    title: "Conta e perfil",
    description: "Ajuda para criar conta, acessar, editar perfil e gerenciar sua conta.",
    path: "/help/account",
  },
  {
    id: "security",
    title: "Privacidade e segurança",
    description: "Proteção da conta, bloqueios, denúncias e segurança no Tibo.",
    path: "/help/security",
  },
  {
    id: "posts",
    title: "Publicações",
    description: "Fotos, vídeos, comentários, curtidas e compartilhamentos.",
    path: "/help/posts",
  },
  {
    id: "messages",
    title: "Mensagens",
    description: "Conversas, privacidade e recursos de comunicação.",
    path: "/help/messages",
  },
  {
    id: "communities",
    title: "Comunidades",
    description: "Criar, administrar e participar de comunidades.",
    path: "/help/community",
  },
  {
    id: "business",
    title: "Tibo Business",
    description: "Ferramentas para empresas, páginas comerciais e estatísticas.",
    path: "/help/business",
  },
  {
    id: "ads",
    title: "Tibo Ads",
    description: "Publicidade, campanhas, políticas e anúncios.",
    path: "/help/ads",
  },
  {
    id: "shop",
    title: "Tibo Shop",
    description: "Compras, vendas, produtos e suporte comercial.",
    path: "/help/shop",
  },
];
