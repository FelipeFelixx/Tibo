import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { BadgeCheck } from "lucide-react";
import type { UserSummary } from "./api";

export function UserListItem({ user, trailing }: { user: UserSummary; trailing?: React.ReactNode }) {
  const name = [user.nome, user.sobrenome].filter(Boolean).join(" ") || user.username;
  const initials = name.split(" ").slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Link to="/u/$username" params={{ username: user.username }} className="flex flex-1 items-center gap-3">
        <Avatar className="h-11 w-11">
          <SignedAvatarImage bucket="avatars" path={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 truncate font-medium">
            {name}
            {user.verificado && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
          </div>
          <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
        </div>
      </Link>
      {trailing}
    </div>
  );
}