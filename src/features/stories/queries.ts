import { queryOptions } from "@tanstack/react-query";
import { fetchHighlightStories, fetchHighlights, fetchStoryFeed, fetchStoryViewers } from "./api";

export const storyKeys = {
  all: ["stories"] as const,
  feed: () => ["stories", "feed"] as const,
  viewers: (storyId: string) => ["stories", "viewers", storyId] as const,
  highlights: (userId: string) => ["stories", "highlights", userId] as const,
  highlightStories: (ids: string[]) => ["stories", "highlight-items", ids.join(",")] as const,
};

export const storyFeedOptions = () =>
  queryOptions({
    queryKey: storyKeys.feed(),
    queryFn: fetchStoryFeed,
    staleTime: 30_000,
  });

export const storyViewersOptions = (storyId: string | null) =>
  queryOptions({
    queryKey: storyKeys.viewers(storyId ?? "none"),
    queryFn: () => (storyId ? fetchStoryViewers(storyId) : Promise.resolve([])),
    enabled: !!storyId,
    staleTime: 10_000,
  });

export const highlightsOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: storyKeys.highlights(userId ?? "none"),
    queryFn: () => (userId ? fetchHighlights(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 60_000,
  });

export const highlightStoriesOptions = (storyIds: string[]) =>
  queryOptions({
    queryKey: storyKeys.highlightStories(storyIds),
    queryFn: () => fetchHighlightStories(storyIds),
    enabled: storyIds.length > 0,
    staleTime: 60_000,
  });