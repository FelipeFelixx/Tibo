import { infiniteQueryOptions } from "@tanstack/react-query";
import { fetchClipsPage } from "@/features/feed/api";

export const clipsKeys = {
  all: ["clips"] as const,
  home: () => ["clips", "home"] as const,
};

export const clipsInfiniteOptions = () =>
  infiniteQueryOptions({
    queryKey: clipsKeys.home(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchClipsPage(pageParam),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 15_000,
  });
