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
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/auth";
import { SessionWatermark } from "@/components/SessionWatermark";
import { PageBackdrop } from "@/components/PageBackdrop";

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
  const [menuQuery, setMenuQuery] = useState("");
  const { user, logout } = useAuth();
  const admin = isAdmin(user);

  const nav = NAV.map((item) => {
    if (item.id !== "weapon" || !item.children) return item;
    return {
      ...item,
      children: admin
        ? item.children
        : item.children.filter((c) => c.id !== "mms-admin"),
    };
  });

  const query = menuQuery.trim().toLowerCase();
  const filteredNav = query
    ? nav
        .map((item) => {
          const labelMatch = item.label.toLowerCase().includes(query);
          const matchedChildren = item.children?.filter((c) =>
            c.label.toLowerCase().includes(query),
          );
          if (labelMatch) return item;
          if (matchedChildren && matchedChildren.length > 0) {
            return { ...item, children: matchedChildren };
          }
          return null;
        })
        .filter((item): item is NavItem => item !== null)
    : nav;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      if (!prev) setMenuQuery("");
      return !prev;
    });
  };

  const displayName = (user?.displayName || user?.username || "User").toUpperCase();
  const roleLabel = user?.role ?? "UNIT";

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SessionWatermark />
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* User block */}
        <div className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "p-4")}>
          <div
            className={cn(
              "flex",
              collapsed ? "flex-col items-center gap-2" : "items-center gap-3",
            )}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold">
              <User className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{displayName}</div>
                <div className="text-xs text-sidebar-foreground/60">
                  Role: <span className="text-sidebar-primary">{roleLabel}</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="rounded p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          {!collapsed && (
            <div className="mt-3 relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50 pointer-events-none" />
              <input
                type="search"
                value={menuQuery}
                onChange={(e) => setMenuQuery(e.target.value)}
                placeholder="Search menu..."
                aria-label="Search menu"
                className="w-full rounded bg-sidebar-accent/40 border border-sidebar-border pl-8 pr-2 py-1.5 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredNav.length === 0 && !collapsed && (
            <div className="px-4 py-3 text-xs text-sidebar-foreground/50">No menu items found</div>
          )}
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const showChildren =
              !collapsed &&
              !!item.children?.length &&
              (isActive || query.length > 0);
            return (
              <div key={item.id}>
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    onSelect(item.id);
                    if (collapsed) setCollapsed(false);
                  }}
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

                {showChildren && (
                  <div className="bg-sidebar-accent/30 py-1">
                    {item.children!.map((c) => {
                      const subActive = activeSub === c.id && isActive;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelect(item.id, c.id);
                            setMenuQuery("");
                          }}
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

        <div className="border-t border-sidebar-border p-3 text-[12px] text-sidebar-foreground/50">
          {!collapsed && <div>MISO v5.0 · Indian Army</div>}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-1.5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Shield className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <div className="hidden sm:block">
                <div className="text-[12px] uppercase tracking-widest text-muted-foreground">
                  Indian Army
                </div>
                <div className="text-xs font-semibold text-foreground">भारतीय सेना</div>
              </div>
            </div>

            <div className="text-center min-w-0">
              <h1 className="truncate text-base sm:text-lg font-bold text-primary tracking-wide">
                MANAGEMENT INFORMATION SYSTEM ORGANISATION
              </h1>
              <div className="text-[12px] text-muted-foreground tracking-wider">
                MISO · Version 5.0
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative rounded-full p-2 text-muted-foreground hover:bg-muted">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
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
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>

          {/* Breadcrumb bar */}
          <div className="bg-primary text-primary-foreground px-4 py-1.5 text-[13px] flex items-center gap-2">
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

        <div className="relative flex-1 min-h-0">
          <PageBackdrop />
          <main className="relative h-full overflow-y-auto p-2">{children}</main>
        </div>
      </div>
    </div>
  );
}
