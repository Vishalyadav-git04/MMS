import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  buildWatermarkLine,
  getCachedClientIp,
  resolveClientIp,
} from "@/lib/session-watermark";

/** Single diagonal session stamp (IP · username · datetime) — design-system watermark. */
export function SessionWatermark() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [clientIp, setClientIp] = useState(() => getCachedClientIp() || "…");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Force refresh after login so we never stick on 127.0.0.1 / N/A.
    resolveClientIp(true).then((ip) => {
      if (!cancelled) setClientIp(ip);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  if (!user) return null;

  const username = (user.username || user.displayName || "USER").toUpperCase();
  const line = buildWatermarkLine({ clientIp, username, date: now });

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden select-none print:z-[9999]"
      aria-hidden="true"
    >
      <div className="mms-pagebg__ip">{line}</div>
    </div>
  );
}
