import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { votePoll } from "../api";
import { feedKeys } from "../queries";
import type { PollRow } from "../types";
import { cn } from "@/lib/utils";

export function PollBlock({ poll }: { poll: PollRow }) {
  const qc = useQueryClient();
  const votedIds = poll.options.filter((o) => o.votedByMe).map((o) => o.id);
  const closed = poll.closes_at && new Date(poll.closes_at) < new Date();

  const vote = useMutation({
    mutationFn: (optionId: string) => votePoll(poll.id, optionId, poll.allow_multiple, votedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: feedKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="font-medium">{poll.question}</p>
      <div className="mt-3 space-y-2">
        {poll.options.map((opt) => {
          const pct = poll.totalVotes ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={closed || vote.isPending}
              onClick={() => vote.mutate(opt.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border p-3 text-left text-sm transition",
                opt.votedByMe ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/15"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between">
                <span>{opt.label}</span>
                <span className="text-xs text-muted-foreground">{pct}% · {opt.votes}</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {poll.totalVotes} voto{poll.totalVotes === 1 ? "" : "s"}
        {poll.allow_multiple && " · múltipla escolha"}
        {closed && " · encerrada"}
      </p>
    </div>
  );
}