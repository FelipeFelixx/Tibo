import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-48 w-full sm:h-64" />
      <div className="mx-auto max-w-4xl px-4">
        <div className="-mt-16 flex flex-col items-center gap-4 sm:-mt-20 sm:flex-row sm:items-end">
          <Skeleton className="h-32 w-32 rounded-full ring-4 ring-background sm:h-40 sm:w-40" />
          <div className="flex-1 space-y-2 pb-2 text-center sm:text-left">
            <Skeleton className="mx-auto h-6 w-48 sm:mx-0" />
            <Skeleton className="mx-auto h-4 w-32 sm:mx-0" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="mt-6 h-20" />
      </div>
    </div>
  );
}