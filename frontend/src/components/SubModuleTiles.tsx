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
    <div className="mms-rise grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn("mms-tile", isActive && "mms-tile--on")}
          >
            <div className="mms-tile__icon" aria-hidden>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="mms-tile__title">{t.label}</div>
              {t.description && <div className="mms-tile__desc">{t.description}</div>}
            </div>
            {isActive && <span className="mms-tile__dot" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
