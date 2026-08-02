import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export function FormPanel({
  title,
  children,
  footer,
  tabs,
  /** When true, panel fills the viewport (long forms). Short forms leave this false so no empty gap. */
  fill = false,
  /** When fill is true, keep body from scrolling so children can manage their own scroll regions. */
  lockBodyScroll = false,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: ReactNode;
  fill?: boolean;
  lockBodyScroll?: boolean;
}) {
  return (
    <div
      className={cn(
        "mms-panel mms-rise flex flex-col",
        fill
          ? "absolute inset-0 min-h-0 overflow-hidden"
          : "w-full max-h-full overflow-visible",
      )}
    >
      <div className="mms-panel__head shrink-0 px-3 py-1.5 sm:px-5">
        <h2 className="mms-panel__title text-[13px] sm:text-[15px] uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {tabs && (
        <div className="shrink-0 border-b border-border bg-secondary/60 px-3 pt-1">{tabs}</div>
      )}
      <div
        className={cn(
          "compact-form p-2 sm:p-3",
          fill
            ? cn(
                "relative flex min-h-0 flex-1 flex-col",
                lockBodyScroll ? "overflow-hidden" : "overflow-y-auto",
              )
            : "overflow-visible",
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="mms-panel__foot shrink-0 px-3 py-1.5 sm:px-5">{footer}</div>
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
        "grid grid-cols-1 sm:grid-cols-[112px_minmax(0,1fr)] items-center gap-x-1.5 gap-y-0",
        className,
      )}
    >
      <label className="text-[12px] font-semibold leading-tight text-muted-foreground sm:text-right">
        {required && <span className="text-destructive mr-0.5">*</span>}
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-2 gap-y-1",
        cols === 4
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : cols === 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2",
        className,
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
    <div role="tablist" className="flex flex-wrap gap-0.5 -mb-px">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "px-3 py-1 text-[13px] font-semibold rounded-t-lg border border-b-0 transition-colors",
              active
                ? "bg-card text-primary border-border border-t-2 border-t-primary"
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
    <div className="mms-rise flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <PageHeader
        compact
        eyebrow={section}
        title={title}
        className="shrink-0"
        action={
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1 text-[13px] font-semibold text-primary shadow-sm hover:bg-secondary"
          >
            ← Back to sub-modules
          </button>
        }
      />
      {/* Absolute fill so FormPanel height is exact viewport remainder (footer never clips) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
