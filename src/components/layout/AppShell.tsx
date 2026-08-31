import type { ReactNode } from "react";
import { TopBar, type TopBarProps } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

export interface AppShellProps extends TopBarProps {
  children: ReactNode;
  hideBottomNav?: boolean;
  contentClassName?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const widths: Record<NonNullable<AppShellProps["maxWidth"]>, string> = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export function AppShell({
  children,
  hideBottomNav,
  contentClassName,
  maxWidth = "md",
  ...topBar
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar {...topBar} />
      <main
        className={cn(
          "mx-auto w-full px-3 pt-4 sm:px-4 sm:pt-6",
          widths[maxWidth],
          contentClassName,
        )}
        style={{ paddingBottom: hideBottomNav ? undefined : "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        <div className="animate-fade-in">{children}</div>
      </main>
      {hideBottomNav ? null : <BottomNav />}
    </div>
  );
}