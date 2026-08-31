import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  fetchCategories,
  fetchCommunitiesPage,
  fetchCommunityBySlug,
  fetchJoinRequests,
  fetchMembers,
  fetchViewerMembership,
} from "./api";

export const communityKeys = {
  all: ["community"] as const,
  list: (params: { search?: string; category?: string; onlyMine?: boolean }) =>
    ["community", "list", params] as const,
  bySlug: (slug: string) => ["community", "slug", slug] as const,
  categories: () => ["community", "categories"] as const,
  viewer: (id: string) => ["community", "viewer", id] as const,
  members: (id: string) => ["community", "members", id] as const,
  requests: (id: string) => ["community", "requests", id] as const,
};

export const categoriesOptions = () =>
  queryOptions({
    queryKey: communityKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

export const communitiesInfiniteOptions = (params: {
  search?: string;
  category?: string;
  onlyMine?: boolean;
}) =>
  infiniteQueryOptions({
    queryKey: communityKeys.list(params),
    initialPageParam: 0 as number,
    queryFn: ({ pageParam }) =>
      fetchCommunitiesPage({
        page: pageParam,
        search: params.search,
        categorySlug: params.category,
        onlyMine: params.onlyMine,
      }),
    getNextPageParam: (last) => last.nextPage,
    staleTime: 30_000,
  });

export const communityBySlugOptions = (slug: string) =>
  queryOptions({
    queryKey: communityKeys.bySlug(slug),
    queryFn: () => fetchCommunityBySlug(slug),
    staleTime: 30_000,
  });

export const viewerMembershipOptions = (communityId: string | undefined) =>
  queryOptions({
    queryKey: communityKeys.viewer(communityId ?? "none"),
    queryFn: () =>
      communityId ? fetchViewerMembership(communityId) : Promise.resolve(null),
    enabled: !!communityId,
    staleTime: 15_000,
  });

export const membersInfiniteOptions = (communityId: string) =>
  infiniteQueryOptions({
    queryKey: communityKeys.members(communityId),
    initialPageParam: 0 as number,
    queryFn: ({ pageParam }) => fetchMembers(communityId, pageParam, 20),
    getNextPageParam: (last) => last.nextPage,
    staleTime: 30_000,
  });

export const joinRequestsOptions = (communityId: string) =>
  queryOptions({
    queryKey: communityKeys.requests(communityId),
    queryFn: () => fetchJoinRequests(communityId),
    staleTime: 15_000,
  });