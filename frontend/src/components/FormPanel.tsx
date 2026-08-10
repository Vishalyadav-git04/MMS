import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const FormScreenContext = React.createContext<{ onBack?: () => void }>({
  onBack: undefined,
});

export function FormPanel({
  title,
  note,
  extra,
  children,
  footer,
  tabs,
  /** When true, panel absolutely fills the FormScreen slot (best for nested scroll regions). */
  fill = false,
  /** Keep body from scrolling so children can manage their own scroll regions. */
  lockBodyScroll = false,
  /** Allow absolute popups (e.g. suggest dropdowns) to float over panel boundaries & footer. */
  overflowVisible = false,
  onBack: directOnBack,
}: {
  title: string;
  /** Optional caption under the panel title (design-system panel note). */
  note?: string;
  /** Optional actions in the panel head (export / records, etc.). */
  extra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: ReactNode;
  fill?: boolean;
  lockBodyScroll?: boolean;
  overflowVisible?: boolean;
  onBack?: () => void;
}) {
  const screenCtx = React.useContext(FormScreenContext);
  const handleBack = directOnBack || screenCtx.onBack;

  return (
    <div
      className={cn(
        /* Hug content when short; cap at slot height so long bodies scroll with footer pinned. */
        "mms-panel mms-rise flex min-h-0 max-h-full w-full flex-col",
        overflowVisible ? "overflow-visible" : "overflow-hidden",
        fill && "absolute inset-0",
      )}
    >
      <div className="mms-panel__head shrink-0">
        <h2 className="mms-panel__title">{title}</h2>
        {note ? <p className="mms-panel__note">{note}</p> : null}
        {extra ? <div className="mms-panel__extra">{extra}</div> : null}
      </div>
      {tabs && (
        <div className="shrink-0 border-b border-[var(--line-soft,#dfe9f4)] bg-[var(--surface-alt,#eff5fb)] px-6 pt-2">
          {tabs}
        </div>
      )}
      <div
        className={cn(
          /* flex-1 + min-h-0 so body shrinks under max-h panel and scrolls above the footer
             (avoids footer overlapping the results). Short forms still hug content because
             the panel height stays content-driven when under the max. */
          "mms-form mms-panel__body relative min-h-0 flex-1",
          overflowVisible
            ? "overflow-visible"
            : lockBodyScroll
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto overscroll-contain",
        )}
      >
        {children}
      </div>
      {(footer || handleBack) && (
        <div className="mms-panel__foot shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] relative z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {handleBack ? (
            <Button
              type="button"
              variant="outline"
              className="h-9.5 px-4 font-semibold"
              onClick={handleBack}
            >
              ← Back
            </Button>
          ) : (
            <span />
          )}
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Uppercase section label + hairline rule (breaks long forms into groups). */
export function FormSection({ title }: { title: string }) {
  return (
    <div className="mms-section mms-span-full">
      <span className="mms-section__title">{title}</span>
      <hr className="mms-section__rule" />
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
    <div className={cn("mms-form-row", className)}>
      <label className="mms-form__label">
        {required && <span className="mr-0.5 text-[var(--danger,#b3261e)]">*</span>}
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
  style,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "mms-form-grid",
        cols === 4
          ? "mms-form-grid--4"
          : cols === 3
            ? "mms-form-grid--3"
            : "mms-form-grid--2",
        className,
      )}
      style={style}
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
    <div role="tablist" className="flex flex-wrap gap-1 -mb-px">
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
              "h-8 px-3 text-[12px] font-semibold rounded-t-[8px] border border-b-0 transition-[color,background-color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              active
                ? "bg-[var(--surface,#fff)] text-[var(--accent,#14568c)] border-[var(--line,#cddcec)] border-t-2 border-t-[var(--accent,#14568c)]"
                : "bg-transparent text-[var(--ink-soft,#54606c)] border-transparent hover:text-[var(--accent,#14568c)]",
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
    <FormScreenContext.Provider value={{ onBack }}>
      <div className="mms-rise flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-visible">
        <PageHeader
          eyebrow={section}
          title={title}
          compact
          className="shrink-0"
          action={null}
        />
        {/* Constrained slot: FormPanel body scrolls; footer stays pinned */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
          {children}
        </div>
      </div>
    </FormScreenContext.Provider>
  );
}
