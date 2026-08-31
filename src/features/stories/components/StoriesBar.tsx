import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { storyFeedOptions } from "../queries";
import { StoryRing } from "./StoryRing";
import { StoryViewer } from "./StoryViewer";
import { StoryComposer } from "./StoryComposer";
import { SponsoredStoryCard } from "@/features/business/components/SponsoredStoryCard";
import type { Profile } from "@/features/profile/types";

export function StoriesBar({ me }: { me: Profile }) {
  const { data: groups = [], isLoading } = useQuery(storyFeedOptions());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);

  const myName = [me.nome, me.sobrenome].filter(Boolean).join(" ") || me.username;
  const myGroupIndex = groups.findIndex((g) => g.isMine);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => (myGroupIndex >= 0 ? setOpenIndex(myGroupIndex) : setComposing(true))}
            className="flex shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className="relative">
              <StoryRing
                avatarPath={me.avatar_url}
                name={myName}
                hasStory={myGroupIndex >= 0}
                hasUnseen={myGroupIndex >= 0 && groups[myGroupIndex]?.hasUnseen}
              />
              <span
                role="presentation"
                onClick={(e) => { e.stopPropagation(); setComposing(true); }}
                className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </span>
            </span>
            <span className="max-w-[68px] truncate text-[11px] text-muted-foreground">Seu story</span>
          </button>

          {groups.filter((g) => !g.isMine).map((g) => {
            const idx = groups.indexOf(g);
            const name = [g.author.nome, g.author.sobrenome].filter(Boolean).join(" ") || g.author.username;
            return (
              <button
                key={g.author.id}
                type="button"
                onClick={() => setOpenIndex(idx)}
                className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
              >
                <StoryRing avatarPath={g.author.avatar_url} name={name} hasUnseen={g.hasUnseen} />
                <span className="max-w-[68px] truncate text-[11px] text-muted-foreground">{g.author.username}</span>
              </button>
            );
          })}

          <SponsoredStoryCard />

          {groups.length === 0 && (
            <p className="self-center text-xs text-muted-foreground">
              Nenhum story ativo. Publique o primeiro!
            </p>
          )}
        </div>
      </div>

      {openIndex !== null && groups[openIndex] && (
        <StoryViewer groups={groups} startIndex={openIndex} currentUserId={me.id} onClose={() => setOpenIndex(null)} />
      )}
      {composing && <StoryComposer onClose={() => setComposing(false)} />}
    </>
  );
}