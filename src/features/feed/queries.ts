import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchComments, fetchCommunityPostsPage, fetchFeedPage, fetchUserPostsPage } from "./api";

export const feedKeys = {
  all: ["feed"] as const,
  home: () => ["feed", "home"] as const,
  user: (userId: string) => ["feed", "user", userId] as const,
  community: (communityId: string) => ["feed", "community", communityId] as const,
  comments: (postId: string) => ["feed", "comments", postId] as const,
};

export const homeFeedInfiniteOptions = () =>
  infiniteQueryOptions({
    queryKey: feedKeys.home(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

export const userPostsInfiniteOptions = (userId: string) =>
  infiniteQueryOptions({
    queryKey: feedKeys.user(userId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchUserPostsPage(userId, pageParam),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });

export const communityPostsInfiniteOptions = (communityId: string) =>
  infiniteQueryOptions({
    queryKey: feedKeys.community(communityId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchCommunityPostsPage(communityId, pageParam),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });

export const commentsOptions = (postId: string) =>
  queryOptions({
    queryKey: feedKeys.comments(postId),
    queryFn: () => fetchComments(postId),
    staleTime: 15_000,
  });