import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Eyebrow → title → subtitle → optional action (design-system §8.2). */
export function PageHeader({
  eyebrow = "Overview",
  title,
  subtitle,
  action,
  compact,
  className,
  titleClassName,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mms-page-header mms-rise flex items-end justify-between gap-4",
        compact && "mms-page-header--compact",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="mms-page-header__eyebrow">{eyebrow}</div> : null}
        <h1 className={cn("mms-page-header__title truncate", titleClassName)}>{title}</h1>
        {subtitle ? <p className="mms-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
