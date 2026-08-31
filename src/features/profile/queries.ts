import { queryOptions } from "@tanstack/react-query";
import {
  fetchProfileByUsername,
  fetchViewerRelationship,
  getMyProfile,
  getSignedImageUrl,
  type BucketName,
} from "./api";

export const profileKeys = {
  all: ["profile"] as const,
  byUsername: (u: string) => ["profile", "username", u] as const,
  me: () => ["profile", "me"] as const,
  relationship: (targetId: string) => ["profile", "relationship", targetId] as const,
  signed: (bucket: BucketName, path: string) => ["storage", bucket, path] as const,
};

export const profileByUsernameOptions = (username: string) =>
  queryOptions({
    queryKey: profileKeys.byUsername(username),
    queryFn: () => fetchProfileByUsername(username),
    staleTime: 30_000,
  });

export const myProfileOptions = () =>
  queryOptions({
    queryKey: profileKeys.me(),
    queryFn: () => getMyProfile(),
    staleTime: 60_000,
  });

export const viewerRelationshipOptions = (targetId: string | undefined) =>
  queryOptions({
    queryKey: profileKeys.relationship(targetId ?? "none"),
    queryFn: () => (targetId ? fetchViewerRelationship(targetId) : Promise.resolve(null)),
    enabled: !!targetId,
    staleTime: 15_000,
  });

export const signedImageOptions = (bucket: BucketName, path: string | null | undefined) =>
  queryOptions({
    queryKey: profileKeys.signed(bucket, path ?? ""),
    queryFn: () => (path ? getSignedImageUrl(bucket, path, 3600) : Promise.resolve(null)),
    enabled: !!path,
    staleTime: 50 * 60_000, // 50 min (URLs valem 60 min)
    gcTime: 55 * 60_000,
  });