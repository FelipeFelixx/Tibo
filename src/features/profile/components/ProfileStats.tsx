import { Link } from "@tanstack/react-router";
import type { ProfileStats as Stats } from "../types";

const items: Array<{
  key: keyof Stats;
  label: string;
  to: "/u/$username/amigos" | "/u/$username/seguidores" | "/u/$username/seguindo";
}> = [
  { key: "amigos", label: "Amigos", to: "/u/$username/amigos" },
  { key: "seguidores", label: "Seguidores", to: "/u/$username/seguidores" },
  { key: "seguindo", label: "Seguindo", to: "/u/$username/seguindo" },
];

export function ProfileStats({ stats, username }: { stats: Stats; username: string }) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-4">
      {items.map(({ key, label, to }) => (
        <Link
          key={key}
          to={to}
          params={{ username }}
          className="rounded-2xl border border-border bg-card/60 p-4 text-center backdrop-blur transition hover:border-primary/40 hover:bg-card"
        >
          <div className="font-display text-2xl font-bold">{stats[key].toLocaleString("pt-BR")}</div>
          <div className="text-xs text-muted-foreground sm:text-sm">{label}</div>
        </Link>
      ))}
    </div>
  );
}