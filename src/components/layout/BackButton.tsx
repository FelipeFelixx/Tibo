import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({ className, label = "Voltar" }: { className?: string; label?: string }) {
  const router = useRouter();
  function onClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full transition-transform duration-200 hover:-translate-x-0.5 hover:bg-accent/50 active:scale-95",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}