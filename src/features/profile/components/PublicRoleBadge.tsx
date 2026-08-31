import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_META: Record<
  string,
  { label: string; className: string }
> = {
  founder: {
    label: "Fundador",
    className:
      "border-blue-400/40 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm shadow-blue-500/20",
  },
  manager: {
    label: "Gerente",
    className:
      "border-violet-400/40 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm shadow-violet-500/20",
  },
  admin: {
    label: "Administrador",
    className:
      "border-rose-400/40 bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-sm shadow-rose-500/20",
  },
  moderator: {
    label: "Moderador",
    className:
      "border-orange-400/40 bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-500/20",
  },
  ambassador: {
    label: "Embaixador",
    className:
      "border-yellow-400/40 bg-gradient-to-r from-yellow-500 to-orange-400 text-white shadow-sm shadow-yellow-500/20",
  },
  staff: {
    label: "Staff",
    className:
      "border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-500/20",
  },
};

export function PublicRoleBadge({
  role,
  className,
}: {
  role: string | null | undefined;
  className?: string;
}) {
  if (!role) return null;

  const meta = ROLE_META[role];

  if (!meta) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        meta.className,
        className,
      )}
    >
      <Crown className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
