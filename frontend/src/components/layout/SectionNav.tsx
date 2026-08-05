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
  const [open, setOpen] = useState(!formOpen);
  const [menuQuery, setMenuQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Collapse on navigation when a form owns the page; stay expanded on main screens.
  useEffect(() => {
    setMenuQuery("");
    setOpen(!formOpen);
  }, [active, activeSub, formOpen]);

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
        "mms-sidebar-nav relative z-10 flex flex-col border-r border-[#cddcec]/80 bg-white/90 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0 select-none shadow-sm",
        open ? "w-[250px]" : "w-[60px]"
      )}
    >
      {/* Sidebar Header & Toggle */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-[#cddcec]/60">
        {open ? (
          <div className="flex items-center gap-2 min-w-0 px-1">
            <Layers className="h-4 w-4 text-[#14568c] shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#14568c] truncate">
              Navigation
            </span>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center">
            <Layers className="h-4 w-4 text-[#14568c]" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg text-[#54606c] hover:bg-[#e8f2fa] hover:text-[#14568c] transition-colors focus:outline-none"
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
            <span className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#616d79]">
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
                    "mms-sidebar-item flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 text-left cursor-pointer",
                    on
                      ? "bg-gradient-to-r from-[#14568c] to-[#1d74b8] text-white shadow-md shadow-[#14568c]/20"
                      : "text-[#54606c] hover:bg-[#eff5fb] hover:text-[#14568c]",
                    !open && "justify-center px-0 py-2.5"
                  )}
                  onClick={() => {
                    if (s.children?.length) {
                      onSelect(s.id, s.children[0].id);
                    } else {
                      onSelect(s.id);
                    }
                    if (formOpen && !open) setOpen(false);
                  }}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", on ? "text-white" : "text-[#14568c]")} />
                  {open && <span className="truncate flex-1">{s.label}</span>}
                  {open && s.children && s.children.length > 0 && (
                    <span className={cn("text-[10px] font-normal opacity-70", on ? "text-white" : "text-[#616d79]")}>
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
          <div className="flex flex-col gap-2 pt-2 border-t border-[#dfe9f4]">
            {open ? (
              <>
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#616d79]">
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
                    className="w-full"
                  />
                </div>

                {/* Screens vertical list */}
                <div role="radiogroup" aria-label="Screens" className="flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-0.5">
                  {filteredScreens.length === 0 && (
                    <span className="text-xs text-[#616d79] px-2 py-1">No matching screens</span>
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
                          "mms-sidebar-subitem flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 text-left cursor-pointer",
                          on
                            ? "bg-[#14568c]/10 text-[#14568c] font-bold border-l-3 border-[#14568c]"
                            : "text-[#54606c] hover:bg-[#eff5fb] hover:text-[#14568c] font-medium"
                        )}
                        onClick={() => {
                          onSelect(active, c.id);
                          if (formOpen) setOpen(false);
                        }}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                            on ? "bg-[#14568c]" : "bg-[#cddcec]"
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
                        on ? "bg-[#14568c] ring-2 ring-[#14568c]/30 scale-125" : "bg-[#cddcec] hover:bg-[#14568c]/50"
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

      {/* Footer info in sidebar when expanded */}
      {open && formOpen && (
        <div className="p-2 border-t border-[#dfe9f4] bg-[#eff5fb]/50">
          <button
            type="button"
            className="w-full text-center py-1 text-[11px] font-semibold text-[#14568c] hover:underline cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Collapse sidebar
          </button>
        </div>
      )}
    </aside>
  );
}

