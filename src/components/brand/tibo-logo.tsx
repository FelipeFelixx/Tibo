import { cn } from "@/lib/utils";

export function TiboLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-brand">
        <span className="font-display text-lg font-bold text-brand-foreground">T</span>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
      </span>
      <span className="font-display text-2xl font-bold tracking-tight text-foreground">
        tibo
      </span>
    </div>
  );
}