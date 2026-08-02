import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING_SNAPPY } from "@/lib/motion";
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

  // Collapse on every navigation when a form owns the page; stay expanded on dashboards.
  useEffect(() => {
    setMenuQuery("");
    setOpen(!formOpen);
  }, [active, activeSub, formOpen]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const activeSection = sections.find((s) => s.id === active);
  const screens = activeSection?.children ?? [];
  const query = menuQuery.trim().toLowerCase();
  const filteredScreens = query
    ? screens.filter((c) => c.label.toLowerCase().includes(query))
    : screens;

  const sectionLabel = activeSection?.label ?? "Home";
  const currentScreen =
    screenLabel ||
    screens.find((c) => c.id === activeSub)?.label ||
    (active === "dashboard" ? "Overview" : activeSection?.label) ||
    "—";

  const showMini = formOpen && !open;

  return (
    <div ref={rootRef} className="mms-nav">
      {showMini ? (
        <button
          type="button"
          className="mms-mini"
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <span className="mms-mini__text">
            <span className="mms-mini__sec">{sectionLabel.toUpperCase()}</span>
            <span className="mms-mini__dot" aria-hidden>
              ·
            </span>
            <span>{currentScreen}</span>
          </span>
          <ChevronDown className="mms-mini__chev h-4 w-4" aria-hidden />
        </button>
      ) : (
        <div className="mms-nav__panel">
          {/* Row 1 — sections */}
          <div role="radiogroup" aria-label="Sections" className="mms-seg">
            {sections.map((s) => {
              const on = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={cn("mms-pill", on && "mms-pill--on")}
                  onClick={() => {
                    if (s.children?.length) {
                      onSelect(s.id, s.children[0].id);
                    } else {
                      onSelect(s.id);
                    }
                    if (formOpen) setOpen(false);
                  }}
                >
                  {on && (
                    <motion.span
                      layoutId={reduced ? undefined : "mms-seg-pill"}
                      className="mms-seg__pill"
                      transition={SPRING_SNAPPY}
                      aria-hidden
                    />
                  )}
                  <span className="mms-pill__dot" aria-hidden />
                  <span className="relative z-[1]">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2 — screens in active section */}
          {screens.length > 0 && (
            <div className="mms-nav__row2">
              <div className="mms-nav__search">
                <Search className="h-3.5 w-3.5 opacity-50" aria-hidden />
                <input
                  type="search"
                  value={menuQuery}
                  onChange={(e) => setMenuQuery(e.target.value)}
                  placeholder="Search screens…"
                  aria-label="Search screens"
                />
              </div>
              <div role="radiogroup" aria-label="Screens" className="mms-seg mms-seg--screens">
                {filteredScreens.length === 0 && (
                  <span className="text-xs text-[var(--ink-faint,#616d79)] px-2">No matches</span>
                )}
                {filteredScreens.map((c, i) => {
                  const on = activeSub === c.id;
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.22 }}
                      className={cn("mms-pill mms-pill--sm", on && "mms-pill--on")}
                      onClick={() => {
                        onSelect(active, c.id);
                        if (formOpen) setOpen(false);
                      }}
                    >
                      {on && (
                        <motion.span
                          layoutId={reduced ? undefined : "mms-screen-pill"}
                          className="mms-seg__pill"
                          transition={SPRING_SNAPPY}
                          aria-hidden
                        />
                      )}
                      <span className="mms-pill__dot" aria-hidden />
                      <span className="relative z-[1]">{c.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {formOpen && (
            <button
              type="button"
              className="mms-nav__collapse"
              onClick={() => setOpen(false)}
            >
              Collapse navigation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
