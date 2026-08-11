import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Shield,
  HardDrive,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleId, WeaponSub } from "@/components/AppLayout";

export type SectionNavItem = {
  id: ModuleId;
  label: string;
  children?: { id: WeaponSub; label: string }[];
};

interface Props {
  sections: SectionNavItem[];
  active: ModuleId;
  activeSub: WeaponSub | null;
  onSelect: (m: ModuleId, sub?: WeaponSub) => void;
  /** When true, collapse to mini bar so the form owns the page. */
  formOpen?: boolean;
  screenLabel?: string;
}

const SECTION_ICONS: Record<ModuleId, React.ElementType> = {
  dashboard: LayoutDashboard,
  weapon: Shield,
  "it-asset": HardDrive,
};

export function SectionNav({
  sections,
  active,
  activeSub,
  onSelect,
  formOpen = false,
  screenLabel,
}: Props) {
  const [open, setOpen] = useState(true);
  const [menuQuery, setMenuQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Reset menu search query on navigation; keep user's open/collapsed sidebar state
  useEffect(() => {
    setMenuQuery("");
  }, [active, activeSub]);

  const activeSection = sections.find((s) => s.id === active);
  const screens = activeSection?.children ?? [];
  const query = menuQuery.trim().toLowerCase();
  const filteredScreens = query
    ? screens.filter((c) => c.label.toLowerCase().includes(query))
    : screens;

  const sectionLabel = activeSection?.label ?? "Home";

  return (
    <aside
      ref={rootRef}
      aria-label="Side Navigation"
      className={cn(
        "mms-sidebar-nav relative z-10 flex flex-col border-r border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] transition-all duration-300 ease-in-out shrink-0 select-none shadow-sm",
        open ? "w-[250px]" : "w-[60px]"
      )}
    >
      {/* Sidebar Header & Toggle */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-[var(--line,#cddcec)]">
        {open ? (
          <div className="flex items-center gap-2 min-w-0 px-1">
            <Layers className="h-4 w-4 text-[var(--accent,#14568c)] shrink-0" />
            <span className="text-[15px] font-bold uppercase tracking-wider text-[var(--accent,#14568c)] truncate">
              Navigation
            </span>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center">
            <Layers className="h-4 w-4 text-[var(--accent,#14568c)]" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg text-[var(--ink-soft,#54606c)] hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)] transition-colors focus:outline-none"
          title={open ? "Collapse Navigation" : "Expand Navigation"}
          aria-label={open ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Sidebar Body */}
      <div className="flex-1 flex flex-col gap-4 p-2 overflow-y-auto min-h-0">
        {/* Main Sections */}
        <div className="flex flex-col gap-1">
          {open && (
            <span className="px-2 pt-1 pb-1 text-[13.5px] font-bold uppercase tracking-wider text-[var(--ink-faint,#616d79)]">
              Modules
            </span>
          )}

          <div role="radiogroup" aria-label="Modules" className="flex flex-col gap-1">
            {sections.map((s) => {
              const on = active === s.id;
              const Icon = SECTION_ICONS[s.id] || LayoutDashboard;

              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={!open ? s.label : undefined}
                  className={cn(
                    "mms-sidebar-item flex items-center gap-3 rounded-xl px-3 py-2 text-[16px] font-semibold transition-all duration-200 text-left cursor-pointer",
                    on
                      ? "bg-[var(--accent,#14568c)] text-white shadow-md shadow-black/15"
                      : "text-[var(--ink,#15202b)] hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)]",
                    !open && "justify-center px-0 py-2.5"
                  )}
                  onClick={() => {
                    if (s.children?.length) {
                      onSelect(s.id, s.children[0].id);
                    } else {
                      onSelect(s.id);
                    }
                  }}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", on ? "text-white" : "text-[var(--accent,#14568c)]")} />
                  {open && <span className="truncate flex-1">{s.label}</span>}
                  {open && s.children && s.children.length > 0 && (
                    <span className={cn("text-[13px] font-normal opacity-80", on ? "text-white" : "text-[var(--ink-faint,#616d79)]")}>
                      ({s.children.length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Screens under active section */}
        {screens.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--line,#cddcec)]">
            {open ? (
              <>
                <div className="flex items-center justify-between px-2">
                  <span className="text-[13.5px] font-bold uppercase tracking-wider text-[var(--ink-faint,#616d79)]">
                    {sectionLabel} Screens
                  </span>
                </div>

                {/* Search Box */}
                <div className="mms-nav__search my-0.5 w-full">
                  <Search className="h-3.5 w-3.5 opacity-50 shrink-0" aria-hidden />
                  <input
                    type="search"
                    value={menuQuery}
                    onChange={(e) => setMenuQuery(e.target.value)}
                    placeholder="Search screens…"
                    aria-label="Search screens"
                    className="w-full text-[15px] placeholder:text-[15px]"
                  />
                </div>

                {/* Screens vertical list */}
                <div role="radiogroup" aria-label="Screens" className="flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-0.5">
                  {filteredScreens.length === 0 && (
                    <span className="text-[13px] text-[var(--ink-faint,#616d79)] px-2 py-1">No matching screens</span>
                  )}
                  {filteredScreens.map((c, i) => {
                    const on = activeSub === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        initial={reduced ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className={cn(
                          "mms-sidebar-subitem flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[15px] transition-all duration-150 text-left cursor-pointer",
                          on
                            ? "bg-[var(--accent-soft,#e8f2fa)] text-[var(--accent,#14568c)] font-bold border-l-3 border-[var(--accent,#14568c)]"
                            : "text-[var(--ink-soft,#54606c)] hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)] font-semibold"
                        )}
                        onClick={() => {
                          onSelect(active, c.id);
                        }}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                            on ? "bg-[var(--accent,#14568c)]" : "bg-[var(--line,#cddcec)]"
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{c.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Collapsed screen dots */
              <div className="flex flex-col items-center gap-1.5 py-2">
                {screens.map((c) => {
                  const on = activeSub === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all cursor-pointer",
                        on ? "bg-[var(--accent,#14568c)] ring-2 ring-[var(--accent-soft,#e8f2fa)] scale-125" : "bg-[var(--line,#cddcec)] hover:bg-[var(--ink-faint,#616d79)]"
                      )}
                      onClick={() => onSelect(active, c.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

