import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormPanel({
  title,
  children,
  footer,
  tabs,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="panel-title px-4 py-1.5 text-center">
        <h2 className="text-sm font-bold uppercase tracking-wider underline underline-offset-4">
          {title}
        </h2>
      </div>
      {tabs && (
        <div className="border-b border-border bg-secondary/40 px-4 pt-2">{tabs}</div>
      )}
      <div className="compact-form flex-1 min-h-0 overflow-auto p-3 sm:p-4">{children}</div>
      {footer && (
        <div className="border-t border-border bg-muted/40 px-4 py-2 flex flex-wrap justify-center gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}

export function FormRow({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] items-center gap-1 sm:gap-2", className)}>
      <label className="text-xs font-medium text-foreground">
        {required && <span className="text-destructive mr-1">*</span>}
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-2",
        cols === 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function SwitchTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 -mb-px">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-t-md border border-b-0 transition-colors",
              active
                ? "bg-card text-primary border-border border-t-2 border-t-accent"
                : "bg-transparent text-muted-foreground border-transparent hover:text-primary",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
