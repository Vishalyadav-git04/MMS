import { getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

const CLIENT_IP_KEY = "mms_client_ip";

/** Normalize loopback / mapped forms so the full IPv4 is always shown. */
export function normalizeClientIp(ip: string): string {
  const value = (ip || "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return "127.0.0.1";
  if (lower.startsWith("::ffff:")) return value.slice(value.toLowerCase().indexOf("::ffff:") + 7);
  // Strip surrounding brackets used by some proxies: [::1]
  if (value.startsWith("[") && value.endsWith("]")) {
    return normalizeClientIp(value.slice(1, -1));
  }
  return value;
}

export function setCachedClientIp(ip: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeClientIp(ip);
  if (!normalized || normalized === "N/A" || normalized === "…") return;
  sessionStorage.setItem(CLIENT_IP_KEY, normalized);
}

export function getCachedClientIp(): string {
  if (typeof window === "undefined") return "";
  return normalizeClientIp(sessionStorage.getItem(CLIENT_IP_KEY) || "");
}

export function formatWatermarkStamp(date: Date = new Date()): string {
  const d = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const t = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${d} ${t}`;
}

export function buildWatermarkLine(opts?: {
  clientIp?: string;
  username?: string;
  date?: Date;
}): string {
  const stored = getStoredUser();
  const username = (
    opts?.username ||
    stored?.username ||
    stored?.displayName ||
    "USER"
  ).toUpperCase();
  const clientIp =
    normalizeClientIp(opts?.clientIp || "") || getCachedClientIp() || "N/A";
  // Non-breaking spaces keep IP · user · time as one unbreakable visual unit
  return `${clientIp}\u00A0·\u00A0${username}\u00A0·\u00A0${formatWatermarkStamp(opts?.date)}`;
}

/** Prefer private LAN IPv4 addresses for session watermarks. */
function pickBestIp(candidates: string[]): string | null {
  const normalized = candidates.map(normalizeClientIp).filter(Boolean);
  const ipv4 = normalized.filter((ip) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip));
  const lan = ipv4.find(
    (ip) =>
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip),
  );
  if (lan) return lan;
  const nonLoopback = ipv4.find((ip) => ip !== "127.0.0.1" && ip !== "0.0.0.0");
  return nonLoopback || ipv4[0] || null;
}

/** Discover this workstation's local IP via WebRTC ICE candidates. */
function detectLocalIpViaWebRtc(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
      resolve(null);
      return;
    }

    const ips = new Set<string>();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      resolve(pickBestIp([...ips]));
    };

    const pc = new RTCPeerConnection({ iceServers: [] });
    const timer = window.setTimeout(finish, 1500);

    try {
      pc.createDataChannel("mms-ip");
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          window.clearTimeout(timer);
          finish();
          return;
        }
        const raw = event.candidate.candidate || "";
        const match = raw.match(
          /([0-9]{1,3}(?:\.[0-9]{1,3}){3})|([a-f0-9:]+:+[a-f0-9:]+)/i,
        );
        if (match?.[1]) ips.add(match[1]);
        else if (match?.[2]) ips.add(normalizeClientIp(match[2]));
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          window.clearTimeout(timer);
          finish();
        });
    } catch {
      window.clearTimeout(timer);
      finish();
    }
  });
}

async function detectIpFromBackend(): Promise<string | null> {
  try {
    const res = await api<{ client_ip?: string }>("/auth/me");
    const ip = normalizeClientIp(res.client_ip || "");
    if (!ip || ip === "unknown" || ip === "N/A") return null;
    return ip;
  } catch {
    return null;
  }
}

/** Resolve and cache the client IP for watermarks (screen + print). */
export async function resolveClientIp(): Promise<string> {
  const cached = getCachedClientIp();
  if (cached && cached !== "127.0.0.1") return cached;

  const local = await detectLocalIpViaWebRtc();
  if (local) {
    setCachedClientIp(local);
    return local;
  }

  const fromApi = await detectIpFromBackend();
  if (fromApi) {
    setCachedClientIp(fromApi);
    return fromApi;
  }

  if (cached) return cached;
  return "N/A";
}

/** CSS + markup for embedding the session watermark in print documents. */
export function buildPrintWatermarkParts(line?: string): {
  styles: string;
  html: string;
} {
  const text = line ?? buildWatermarkLine();
  // Sized to cover the rotated bounding box of an A4 page in either orientation.
  const rows = 30;
  const cols = 7;
  const grid = Array.from({ length: rows }, (_, r) => {
    const cells = Array.from(
      { length: cols },
      () => `<span>${escapeXml(text)}</span>`,
    ).join("");
    const offset = r % 2 === 0 ? "" : ' style="margin-left:5rem"';
    return `<div class="mms-wm-row"${offset}>${cells}</div>`;
  }).join("");

  const styles = `
    .mms-wm-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .mms-wm-canvas {
      position: absolute;
      left: 50%;
      top: 50%;
      width: max-content;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5rem;
      transform: translate(-50%, -50%) rotate(-28deg);
      opacity: 0.1;
    }
    .mms-wm-row {
      display: flex;
      width: max-content;
      flex-shrink: 0;
      gap: 3.5rem;
    }
    .mms-wm-row span {
      display: inline-block;
      flex-shrink: 0;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.04em;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
    }
  `;

  const html = `<div class="mms-wm-layer" aria-hidden="true"><div class="mms-wm-canvas">${grid}</div></div>`;

  return { styles, html };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
