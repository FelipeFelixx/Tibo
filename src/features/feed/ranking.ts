import type { PostFull } from "./types";

export interface FeedRankingContext {
  followedAuthorIds: Set<string>;
  friendIds: Set<string>;
  communityIds: Set<string>;
  communityId?: string | null;
}

function recencyScore(createdAt: string): number {
  const ageHours = Math.max(
    0,
    (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  );

  if (ageHours <= 1) return 10;
  if (ageHours <= 6) return 8;
  if (ageHours <= 24) return 6;
  if (ageHours <= 72) return 4;
  if (ageHours <= 168) return 2;

  return 0;
}

function engagementScore(post: PostFull): number {
  return Math.min(
    30,
    post.reactions.total * 2 +
      post.commentCount * 4 +
      post.shareCount * 6 +
      Math.log1p(post.post.view_count ?? 0) * 2
  );
}

/**
 * Gera um número pseudoaleatório estável para um post dentro
 * de uma janela de rotação.
 *
 * Isso permite que o Feed mude de posição ao longo do tempo
 * sem ficar aleatório a cada renderização.
 */
function rotationScore(postId: string): number {
  const ROTATION_WINDOW_MS = 5 * 60 * 1000;
  const window = Math.floor(Date.now() / ROTATION_WINDOW_MS);

  const input = `${postId}:${window}`;

  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  const normalized = Math.abs(hash) % 1000;

  return normalized / 1000;
}

/**
 * Pequena pontuação para favorecer diversidade de formatos.
 *
 * Não substitui o ranking principal.
 * Serve apenas para evitar que conteúdos muito parecidos
 * dominem o topo quando existem outras opções relevantes.
 */
function formatScore(post: PostFull): number {
  if (post.video) return 1.5;
  if (post.images.length > 0) return 1;
  return 0.5;
}

export function scorePost(
  post: PostFull,
  context: FeedRankingContext
): number {
  let score = 0;

  const authorId = post.author.id;

  // ---------------------------------------------------------
  // RELACIONAMENTO
  // ---------------------------------------------------------

  if (context.followedAuthorIds.has(authorId)) {
    score += 20;
  }

  if (context.friendIds.has(authorId)) {
    score += 20;
  }

  // ---------------------------------------------------------
  // COMUNIDADES
  // ---------------------------------------------------------

  if (post.post.community_id) {
    if (context.communityIds.has(post.post.community_id)) {
      score += 15;
    }

    if (context.communityId === post.post.community_id) {
      score += 15;
    }
  }

  // ---------------------------------------------------------
  // RECÊNCIA
  // ---------------------------------------------------------

  score += recencyScore(post.post.created_at);

  // ---------------------------------------------------------
  // ENGAJAMENTO
  // ---------------------------------------------------------

  score += engagementScore(post);

  // ---------------------------------------------------------
  // FORMATO
  // ---------------------------------------------------------

  score += formatScore(post);

  // Vídeo continua sendo um sinal importante,
  // mas não pode sozinho dominar o Feed.
  if (post.video) {
    score += 8;
  }

  // ---------------------------------------------------------
  // DESCOBERTA
  // ---------------------------------------------------------

  if (
    !context.followedAuthorIds.has(authorId) &&
    !context.friendIds.has(authorId)
  ) {
    score += 3;
  }

  return score;
}

/**
 * Reordena os posts considerando:
 *
 * 1. relevância principal;
 * 2. diversidade de autores;
 * 3. rotação periódica;
 * 4. posição original como último desempate.
 */
export function rankPosts(
  posts: PostFull[],
  context: FeedRankingContext
): PostFull[] {
  if (posts.length <= 1) {
    return posts;
  }

  const scored = posts.map((post, index) => ({
    post,
    score: scorePost(post, context),
    rotation: rotationScore(post.post.id),
    index,
  }));

  // Primeiro ordenamos pela pontuação principal.
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // Quando os posts possuem pontuação equivalente,
    // a rotação decide a posição.
    if (b.rotation !== a.rotation) {
      return b.rotation - a.rotation;
    }

    return a.index - b.index;
  });

  // ---------------------------------------------------------
  // DIVERSIDADE DE AUTORES
  // ---------------------------------------------------------
  //
  // Se houver outro conteúdo com pontuação próxima,
  // evitamos colocar o mesmo autor repetidamente.
  //
  // Não fazemos isso de maneira rígida:
  // conteúdo muito mais relevante continua podendo ficar
  // no topo.
  // ---------------------------------------------------------

  const result: typeof scored = [];
  const remaining = [...scored];

  while (remaining.length > 0) {
    const lastAuthorId = result.at(-1)?.post.author.id;

    const candidateIndex = remaining.findIndex((item) => {
      if (!lastAuthorId) return true;

      if (item.post.author.id !== lastAuthorId) {
        // Só aplicamos a diversidade quando a diferença
        // de pontuação não for muito grande.
        const lastScore = result.at(-1)?.score ?? item.score;

        return item.score >= lastScore - 10;
      }

      return false;
    });

    const selectedIndex =
      candidateIndex >= 0 ? candidateIndex : 0;

    result.push(remaining[selectedIndex]);
    remaining.splice(selectedIndex, 1);
  }

  return result.map((item) => item.post);
}
