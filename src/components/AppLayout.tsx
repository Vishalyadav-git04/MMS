import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Shield,
  HardDrive,
  Bell,
  LogOut,
  User,
  Search,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleId = "dashboard" | "weapon" | "it-asset";
export type WeaponSub =
  | "mlccs"
  | "unit-holding"
  | "reports"
  | "mms-admin"
  | "ep-stores"
  | "generate-ro"
  | "eqpt-transfer";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: typeof LayoutDashboard;
  children?: { id: WeaponSub; label: string }[];
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "weapon",
    label: "Weapon",
    icon: Shield,
    children: [
      { id: "mlccs", label: "MLCCS" },
      { id: "unit-holding", label: "Unit Holding" },
      { id: "reports", label: "Reports" },
      { id: "mms-admin", label: "MMS Admin" },
      { id: "ep-stores", label: "EP Stores" },
      { id: "generate-ro", label: "Generate RO" },
      { id: "eqpt-transfer", label: "EQPT Transfer/Deposit" },
    ],
  },
  { id: "it-asset", label: "IT Asset", icon: HardDrive },
];

interface Props {
  active: ModuleId;
  activeSub: WeaponSub | null;
  onSelect: (m: ModuleId, sub?: WeaponSub) => void;
  children: ReactNode;
  breadcrumb: string[];
}

export function AppLayout({ active, activeSub, onSelect, children, breadcrumb }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* User block */}
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold">
              <User className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">VISHAL</div>
                <div className="text-xs text-sidebar-foreground/60">
                  Session: <span className="text-sidebar-primary">59:47</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          {!collapsed && (
            <div className="mt-3 relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
              <input
                type="text"
                placeholder="Search menu..."
                className="w-full rounded bg-sidebar-accent/40 border border-sidebar-border pl-8 pr-2 py-1.5 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <div key={item.id}>
                <button
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary/15 text-sidebar-primary border-l-[3px] border-sidebar-primary"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-primary border-l-[3px] border-transparent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>

                {/* Sub items — visible under active parent only */}
                {!collapsed && item.children && isActive && (
                  <div className="bg-sidebar-accent/30 py-1">
                    {item.children.map((c) => {
                      const subActive = activeSub === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => onSelect(item.id, c.id)}
                          className={cn(
                            "flex w-full items-center gap-2 pl-11 pr-4 py-2 text-xs transition-colors",
                            subActive
                              ? "text-sidebar-primary font-semibold"
                              : "text-sidebar-foreground/70 hover:text-sidebar-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              subActive ? "bg-sidebar-primary" : "bg-sidebar-foreground/30",
                            )}
                          />
                          <span className="truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 text-[10px] text-sidebar-foreground/50">
          {!collapsed && <div>MISO v5.0 · Indian Army</div>}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-2">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Shield className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Indian Army
                </div>
                <div className="text-xs font-semibold text-foreground">भारतीय सेना</div>
              </div>
            </div>

            <div className="text-center min-w-0">
              <h1 className="truncate text-base sm:text-lg font-bold text-primary tracking-wide">
                MANAGEMENT INFORMATION SYSTEM ORGANISATION
              </h1>
              <div className="text-[10px] text-muted-foreground tracking-wider">
                MISO · Version 5.0
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative rounded-full p-2 text-muted-foreground hover:bg-muted">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  3
                </span>
              </button>
              <div className="hidden md:block text-right text-xs">
                <div className="font-medium text-foreground">
                  {new Date().toLocaleDateString("en-GB")}
                </div>
                <div className="text-muted-foreground">
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>

          {/* Breadcrumb bar */}
          <div className="bg-primary text-primary-foreground px-6 py-2 text-xs flex items-center gap-2">
            <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-primary-foreground/40">/</span>}
                <span
                  className={cn(
                    i === breadcrumb.length - 1
                      ? "font-semibold text-accent"
                      : "text-primary-foreground/80",
                  )}
                >
                  {b}
                </span>
              </span>
            ))}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden p-3">{children}</main>
      </div>
    </div>
  );
}
