import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { cn } from "@/lib/utils";

interface StoryRingProps {
  avatarPath: string | null;
  name: string;
  hasUnseen?: boolean;
  hasStory?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { ring: "h-11 w-11", avatar: "h-full w-full" },
  md: { ring: "h-16 w-16", avatar: "h-full w-full" },
  lg: { ring: "h-20 w-20", avatar: "h-full w-full" },
};

export function StoryRing({ avatarPath, name, hasUnseen, hasStory = true, size = "md", className }: StoryRingProps) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full p-[2.5px] transition-transform duration-200",
        hasStory && hasUnseen ? "bg-gradient-brand" : hasStory ? "bg-border" : "bg-transparent",
        className,
      )}
    >
      <span className={cn("grid place-items-center rounded-full bg-background p-[2px]", s.ring)}>
        <Avatar className={s.avatar}>
          <SignedAvatarImage bucket="avatars" path={avatarPath} alt={name} className="h-full w-full object-cover" />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </span>
    </span>
  );
}