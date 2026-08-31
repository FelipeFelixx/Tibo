import { cn } from "@/lib/utils";

export function TiboVerifiedBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const imageSize = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <span
      className={cn(
        "tibo-verified-badge relative inline-flex shrink-0 items-center justify-center align-middle",
        imageSize,
        className,
      )}
      aria-label="Verificado Tibo"
      title="Verificado Tibo"
    >
      <span
        aria-hidden="true"
        className="tibo-verified-glow absolute -inset-1 rounded-full"
      />

      <span
        aria-hidden="true"
        className="tibo-verified-fire absolute -inset-0.5 rounded-full"
      />

      <img
        src="/tibo-verified.png"
        alt="Verificado Tibo"
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_0_4px_rgba(255,180,60,0.8)]"
      />
    </span>
  );
}
