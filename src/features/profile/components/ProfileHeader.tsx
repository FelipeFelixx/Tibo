import { SignedImage } from "./SignedImage";
import { SignedAvatarImage } from "./SignedAvatarImage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, MapPin, Globe, Calendar } from "lucide-react";
import { TiboVerifiedBadge } from "./TiboVerifiedBadge";
import { PublicRoleBadge } from "./PublicRoleBadge";
import type { ProfileWithStats } from "../types";

function initials(nome?: string | null, sobrenome?: string | null, username?: string) {
  const src = [nome, sobrenome].filter(Boolean).join(" ") || username || "?";
  return src
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function formatLocation(p: ProfileWithStats) {
  return [p.cidade, p.estado, p.pais].filter(Boolean).join(", ");
}

export function ProfileHeader({
  profile,
  actions,
  badges,
}: {
  profile: ProfileWithStats;
  actions: React.ReactNode;
  badges?: React.ReactNode;
}) {
  const location = formatLocation(profile);
  const joined = new Date(profile.created_at).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/40 via-primary/20 to-accent/40 sm:h-64">
        <SignedImage
          bucket="covers"
          path={profile.cover_url}
          alt={`Capa de ${profile.username}`}
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>

      <div className="mx-auto max-w-4xl px-4">
        <div className="-mt-16 flex flex-col items-center gap-4 sm:-mt-20 sm:flex-row sm:items-end">
          <Avatar className="h-32 w-32 ring-4 ring-background sm:h-40 sm:w-40">
            {profile.avatar_url ? (
              <SignedAvatarImage
                bucket="avatars"
                path={profile.avatar_url}
                alt={profile.username}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <AvatarFallback className="bg-gradient-brand text-2xl text-brand-foreground">
                {initials(profile.nome, profile.sobrenome, profile.username)}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 pb-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                {[profile.nome, profile.sobrenome].filter(Boolean).join(" ") || profile.username}
              </h1>

              {profile.verificado && (
                <TiboVerifiedBadge size="md" />
              )}

              {profile.premium && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" /> Premium
                </Badge>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>

              <PublicRoleBadge role={profile.publicRole} />
            </div>

            {badges}
          </div>

          <div className="sm:pb-2">{actions}</div>
        </div>

        {profile.bio && (
          <p className="mt-6 whitespace-pre-wrap text-center text-[15px] sm:text-left">
            {profile.bio}
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:justify-start">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
          )}

          {profile.site && (
            <a
              href={profile.site}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="h-4 w-4" />
              {profile.site.replace(/^https?:\/\//, "")}
            </a>
          )}

          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Entrou em {joined}
          </span>
        </div>
      </div>
    </div>
  );
}
