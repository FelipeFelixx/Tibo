import { AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { signedImageOptions } from "../queries";
import type { BucketName } from "../api";

export function SignedAvatarImage({ bucket, path, alt, className, loading = "lazy" }: { bucket: BucketName; path: string | null | undefined; alt: string; className?: string; loading?: "lazy" | "eager" }) {
  const { data: url } = useQuery(signedImageOptions(bucket, path));
  if (!path || !url) return null;
  return <AvatarImage src={url} alt={alt} className={className ?? "h-full w-full object-contain"} loading={loading} />;
}
