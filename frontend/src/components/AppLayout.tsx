import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  HardDrive,
  Bell,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/auth";
import { SessionWatermark } from "@/components/SessionWatermark";
import { PageBackdrop } from "@/components/PageBackdrop";
import { BrandEmblem } from "@/components/BrandEmblem";
import { SectionNav, type SectionNavItem } from "@/components/layout/SectionNav";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useShrinkOnScroll } from "@/hooks/useShrinkOnScroll";
import { EASE_OUT, stageCentre, stageEnter, stageFade } from "@/lib/motion";

const DUMMY_NOTIFICATIONS = [
  {
    id: "n1",
    title: "RO pending approval",
    body: "3 release orders await admin review.",
    time: "10 min ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Census sync complete",
    body: "Unit holding refreshed for 12 units.",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Eqpt transfer raised",
    body: "Transfer #TR-2041 submitted by Unit Ops.",
    time: "Yesterday",
    unread: true,
  },
] as const;

export type ModuleId = "dashboard" | "weapon" | "it-asset";
export type WeaponSub =
  | "mms-admin"
  | "generate-ro"
  | "unit-holding"
  | "mlccs"
  | "eqpt-transfer"
  | "ep-stores"
  | "reports";

const SECTIONS_BASE: SectionNavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  {
    id: "weapon",
    label: "Weapon",
    children: [
      { id: "mms-admin", label: "MMS Admin" },
      { id: "generate-ro", label: "Generate RO" },
      { id: "unit-holding", label: "Unit Holding" },
      { id: "mlccs", label: "MLCCS" },
      { id: "eqpt-transfer", label: "EQPT Transfer/Deposit" },
      { id: "ep-stores", label: "EP Stores" },
      { id: "reports", label: "Reports" },
    ],
  },
  { id: "it-asset", label: "IT Asset" },
];

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  active: ModuleId;
  activeSub: WeaponSub | null;
  onSelect: (m: ModuleId, sub?: WeaponSub) => void;
  children: ReactNode;
  breadcrumb: BreadcrumbItem[];
  /** Keys the 3D stage card — visual only. */
  stageKey?: string;
  /** Collapse nav to mini bar when a form owns the page. */
  formOpen?: boolean;
  screenLabel?: string;
}

export function AppLayout({
  active,
  activeSub,
  onSelect,
  children,
  breadcrumb,
  stageKey,
  formOpen = false,
  screenLabel,
}: Props) {
  const { user, logout } = useAuth();
  const admin = isAdmin(user);
  const shrunk = useShrinkOnScroll(12, ".mms-stage");
  const reduced = useReducedMotion();

  const sections = SECTIONS_BASE.map((item) => {
    if (item.id !== "weapon" || !item.children) return item;
    return {
      ...item,
      children: admin
        ? item.children
        : item.children.filter((c) => c.id !== "mms-admin"),
    };
  });

  const username = (user?.username || "User").toUpperCase();
  const key = stageKey ?? `${active}:${activeSub ?? ""}`;

  return (
    <div className="mms-root relative flex h-screen flex-col overflow-hidden bg-background">
      <SessionWatermark />

      <header className={cn("mms-header shrink-0", shrunk && "mms-header--shrunk")}>
        <div className="mms-header__inner grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-1.5">
          <div className="flex items-center gap-3 min-w-0">
            <BrandEmblem size="sm" className="shrink-0 rounded-full" />
            <div className="hidden sm:block min-w-0">
              <div className="text-[14px] font-bold uppercase tracking-[0.13em] text-primary">
                Indian Army
              </div>
              <div className="mms-brand__sub text-[15px] font-semibold text-foreground">
                भारतीय सेना
              </div>
            </div>
          </div>

          <div className="text-center min-w-0">
            <h1 className="truncate text-[17px] sm:text-[20px] font-bold text-primary tracking-[-0.02em]">
              MANAGEMENT INFORMATION SYSTEM ORGANISATION
            </h1>
            <div className="mms-brand__sub text-[15px] text-muted-foreground tracking-wider">
              MISO · Version 5.0
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative rounded-full p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                    {DUMMY_NOTIFICATIONS.length}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[320px] p-0"
              >
                <div className="border-b border-border px-3 py-2.5">
                  <div className="text-sm font-semibold text-foreground">
                    Notifications
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {DUMMY_NOTIFICATIONS.length} unread
                  </div>
                </div>
                <ul className="max-h-[280px] overflow-y-auto py-1">
                  {DUMMY_NOTIFICATIONS.map((n) => (
                    <li
                      key={n.id}
                      className="flex gap-2.5 px-3 py-2.5 hover:bg-muted/60"
                    >
                      {n.unread && (
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ea8d5]"
                          aria-hidden
                        />
                      )}
                      <div className={cn("min-w-0", !n.unread && "pl-3.5")}>
                        <div className="truncate text-[13px] font-semibold text-foreground">
                          {n.title}
                        </div>
                        <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                          {n.body}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground/80">
                          {n.time}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
            <div className="hidden md:block text-right text-[15px] tabular-nums leading-tight">
              <div className="font-medium text-foreground">
                {new Date().toLocaleDateString("en-GB")}
              </div>
              <div className="text-muted-foreground">
                {new Date().toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div
              className="hidden sm:flex items-center rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[15px] font-semibold uppercase tracking-wide text-foreground"
              title={username}
            >
              {username}
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-[15px] font-semibold text-destructive-foreground hover:opacity-90 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>

        <div className="mms-breadcrumb px-4 py-1.5 text-[15px] flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={() => onSelect("dashboard")}
            className="text-white/90 hover:text-white transition-opacity p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-white/40"
            aria-label="Home"
          >
            <LayoutDashboard className="h-4 w-4 text-white" />
          </button>
          {breadcrumb.map((b, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <span key={`${b.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/60 text-[14px] select-none font-normal">/</span>}
                {isLast || !b.onClick ? (
                  <span
                    className={cn(
                      isLast ? "font-bold text-white tracking-wide" : "text-white/85 font-medium",
                    )}
                  >
                    {b.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={b.onClick}
                    className="text-white/85 hover:text-white hover:underline underline-offset-2 font-medium transition-colors cursor-pointer"
                  >
                    {b.label}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
        <PageBackdrop />
        <SectionNav
          sections={sections}
          active={active}
          activeSub={activeSub}
          onSelect={onSelect}
          formOpen={formOpen}
          screenLabel={screenLabel}
        />
        <div className="mms-content relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              formOpen
                ? "mms-stage min-h-0 flex-1 overflow-hidden"
                : "mms-stage min-h-0 flex-1 overflow-y-auto"
            }
          >
            <div
              className={
                formOpen
                  ? "mms-content-inner flex h-full min-h-0 flex-col px-[clamp(8px,1.3vw,28px)] pb-[clamp(12px,1.8vw,32px)] pt-[clamp(8px,1.1vw,24px)]"
                  : "mms-content-inner min-h-full px-[clamp(10px,1.6vw,32px)] pb-[clamp(20px,3vw,64px)] pt-[clamp(10px,1.4vw,28px)]"
              }
            >
              <motion.div
                key={key}
                className={
                  formOpen
                    ? "mms-stage__card flex min-h-0 flex-1 flex-col"
                    : "mms-stage__card"
                }
                initial={reduced ? stageFade : stageEnter}
                animate={stageCentre}
                transition={{ duration: 0.42, ease: EASE_OUT }}
              >
                {children}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Kept for any callers that still reference icons via AppLayout module. */
export const AppLayoutIcons = { HardDrive, LayoutDashboard };
