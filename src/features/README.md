# Módulos (features)

Organização por domínio. Cada módulo é isolado e contém tudo que precisa:
`components/`, `hooks/`, `api/` (server functions / queries), `types.ts`.

Estrutura sugerida:

```
src/features/
  auth/          # Autenticação, sessão, perfil do usuário logado
  feed/          # Timeline, ranking, descoberta
  posts/         # Criação, edição, mídia
  profile/       # Perfis públicos, seguidores
  social/        # Follows, likes, comentários, notificações
  messaging/     # Chats diretos e grupos
  search/        # Busca global (usuários, posts, tags)
```

Componentes globais e primitivos de UI vivem em `src/components/`.
Design system e tokens vivem em `src/styles.css`.