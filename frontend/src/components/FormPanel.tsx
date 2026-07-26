import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormPanel({
  title,
  children,
  footer,
  tabs,
  /** When true, panel fills the viewport (long forms). Short forms leave this false so no empty gap. */
  fill = false,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: ReactNode;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm",
        fill ? "absolute inset-0 min-h-0" : "w-full max-h-full",
      )}
    >
      <div className="panel-title shrink-0 px-3 py-1 text-center">
        <h2 className="text-[11px] font-bold uppercase tracking-wider underline underline-offset-2">
          {title}
        </h2>
      </div>
      {tabs && (
        <div className="shrink-0 border-b border-border bg-secondary/40 px-3 pt-1">{tabs}</div>
      )}
      <div
        className={cn(
          "compact-form p-2 sm:p-3",
          fill ? "min-h-0 flex-1 overflow-y-auto" : "overflow-visible",
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-border bg-muted/40 px-3 py-1.5 flex flex-wrap justify-center gap-2">
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
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-[100px_minmax(0,1fr)] items-center gap-0.5 sm:gap-1",
        className,
      )}
    >
      <label className="text-[10px] font-medium leading-tight text-foreground">
        {required && <span className="text-destructive mr-0.5">*</span>}
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-x-2 gap-y-1",
        cols === 4
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : cols === 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2",
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
    <div className="flex flex-wrap gap-0.5 -mb-px">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "px-3 py-1 text-[11px] font-semibold rounded-t-md border border-b-0 transition-colors",
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

/** Full-height wrapper for any opened form screen (keeps FormPanel fitting viewport). */
export function FormScreen({
  section,
  title,
  onBack,
  children,
}: {
  section: string;
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{section}</div>
          <h2 className="truncate text-sm font-bold text-primary tracking-tight">{title}</h2>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-secondary"
        >
          ← Back to sub-modules
        </button>
      </div>
      {/* Absolute fill so FormPanel height is exact viewport remainder (footer never clips) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
