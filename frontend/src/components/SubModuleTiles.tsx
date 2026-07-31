import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Tile {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface Props {
  tiles: Tile[];
  active: string;
  onSelect: (id: string) => void;
}

/** Sub-module switcher rendered as small tiles instead of a dropdown. */
export function SubModuleTiles({ tiles, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "group relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
              isActive
                ? "border-accent bg-primary text-primary-foreground shadow-md ring-2 ring-accent/40"
                : "border-border bg-card hover:border-accent/60 hover:shadow-sm",
            )}
          >
            <div
              className={cn(
                "grid h-9 w-9 place-items-center rounded-md transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-primary group-hover:bg-accent group-hover:text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold leading-tight")}>{t.label}</div>
              {t.description && (
                <div
                  className={cn(
                    "mt-0.5 text-[13px] leading-snug",
                    isActive ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {t.description}
                </div>
              )}
            </div>
            {isActive && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
