import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { setReaction } from "../api";
import { feedKeys } from "../queries";
import { REACTION_META, type ReactionKind, type ReactionSummary } from "../types";
import { cn } from "@/lib/utils";
import { Heart, Lightbulb, Laugh, ThumbsUp } from "lucide-react";

export function ReactionBar({ postId, reactions }: { postId: string; reactions: ReactionSummary }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (kind: ReactionKind | null) => setReaction(postId, kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: feedKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const my = reactions.myReaction;
  const label = my ? REACTION_META[my].label : "Curtir";
  const ActiveIcon = my ? ({ curtir: ThumbsUp, amei: Heart, interessante: Lightbulb, engracado: Laugh } as const)[my] : ThumbsUp;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1", my && "text-primary")}
            onClick={() => my && mutation.mutate(null)}
          >
            <ActiveIcon className={cn("h-4 w-4", my === "amei" && "fill-current")} aria-hidden />
            <span>{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <div className="flex gap-1">
            {(Object.keys(REACTION_META) as ReactionKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => mutation.mutate(k)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  my === k && "bg-accent text-primary",
                )}
                title={REACTION_META[k].label}
              >
                {k === "curtir" ? <ThumbsUp className="h-4 w-4" aria-hidden /> : null}
                {k === "amei" ? <Heart className="h-4 w-4" aria-hidden /> : null}
                {k === "interessante" ? <Lightbulb className="h-4 w-4" aria-hidden /> : null}
                {k === "engracado" ? <Laugh className="h-4 w-4" aria-hidden /> : null}
                <span>{REACTION_META[k].label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {reactions.total > 0 && (
        <span className="text-xs text-muted-foreground">{reactions.total}</span>
      )}
    </div>
  );
}