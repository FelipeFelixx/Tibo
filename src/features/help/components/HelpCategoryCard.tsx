import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { HelpCategory } from "../data/help-categories";

export function HelpCategoryCard({
  category,
}: {
  category: HelpCategory;
}) {
  return (
    <Link
      to={category.path}
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">
            {category.title}
          </h3>

          <p className="mt-2 text-sm text-muted-foreground leading-6">
            {category.description}
          </p>
        </div>

        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </Link>
  );
}
