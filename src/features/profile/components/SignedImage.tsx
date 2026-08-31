import { useQuery } from "@tanstack/react-query";
import { signedImageOptions } from "../queries";
import type { BucketName } from "../api";
import { cn } from "@/lib/utils";

interface SignedImageProps {
  bucket: BucketName;
  path: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  loading?: "lazy" | "eager";
}

export function SignedImage({ bucket, path, alt, className, fallback, loading = "lazy" }: SignedImageProps) {
  const { data: url, isLoading, isError } = useQuery(signedImageOptions(bucket, path));
  if (!path || isError) return <>{fallback}</>;
  if (isLoading || !url) {
    return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  }
  return <img src={url} alt={alt} className={className} loading={loading} decoding="async" />;
}