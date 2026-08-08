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

export function isLoopbackIp(ip: string): boolean {
  const normalized = normalizeClientIp(ip);
  return (
    !normalized ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "unknown" ||
    normalized === "N/A" ||
    normalized === "…"
  );
}

function isPrivateLanIpv4(ip: string): boolean {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

/** Accept valid IPv4 addresses for session watermark (prefer LAN IPs, allow loopback IPv4 as fallback). */
export function isWatermarkIp(ip: string): boolean {
  const normalized = normalizeClientIp(ip);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) return false;
  if (normalized === "0.0.0.0" || normalized === "unknown" || normalized === "N/A" || normalized === "…") return false;
  const parts = normalized.split(".").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
  return true;
}

export function setCachedClientIp(ip: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeClientIp(ip);
  if (!isWatermarkIp(normalized)) return;
  sessionStorage.setItem(CLIENT_IP_KEY, normalized);
}

export function getCachedClientIp(): string {
  if (typeof window === "undefined") return "";
  const cached = normalizeClientIp(sessionStorage.getItem(CLIENT_IP_KEY) || "");
  if (!isWatermarkIp(cached)) {
    try {
      sessionStorage.removeItem(CLIENT_IP_KEY);
    } catch {
      /* ignore */
    }
    return "";
  }
  return cached;
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
    [opts?.clientIp, getCachedClientIp()]
      .map((v) => normalizeClientIp(v || ""))
      .find(isWatermarkIp) || "127.0.0.1";
  // Non-breaking spaces keep IP · user · time as one unbreakable visual unit
  return `${clientIp}\u00A0·\u00A0${username}\u00A0·\u00A0${formatWatermarkStamp(opts?.date)}`;
}

/** Rank private NICs: office/home LAN first, then corp 10.x, then 172.16–31 (often Hyper-V), then loopback. */
function lanRank(ip: string): number {
  if (ip.startsWith("192.168.")) return 0;
  if (ip.startsWith("10.")) return 1;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return 2;
  if (ip === "127.0.0.1" || ip.startsWith("127.")) return 8;
  return 9;
}

/** Private LAN IPv4 only — never public WAN (e.g. STUN srflx). */
function pickBestIp(candidates: string[]): string | null {
  const lan = candidates
    .map(normalizeClientIp)
    .filter(isWatermarkIp)
    .sort((a, b) => lanRank(a) - lanRank(b));
  return lan[0] || null;
}

function collectCandidateIp(candidate: RTCIceCandidate, ips: Set<string>): void {
  const raw = candidate.candidate || "";
  const type = candidate.type || (raw.match(/\btyp\s+(\w+)/i)?.[1] ?? "");
  // Host NIC only — ignore srflx/prflx/relay (those are public / relayed).
  if (type && type !== "host") return;

  const address = (candidate as RTCIceCandidate & { address?: string | null }).address;
  if (address && isWatermarkIp(address)) ips.add(normalizeClientIp(address));
  const match = raw.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/);
  if (match?.[1] && isWatermarkIp(match[1])) ips.add(match[1]);
}

/** If the app is opened via a LAN URL, that host is the watermark IP. */
function detectIpFromPageHost(): string | null {
  if (typeof window === "undefined") return null;
  const host = normalizeClientIp(window.location.hostname || "");
  return isWatermarkIp(host) ? host : null;
}

/** Discover this workstation's local LAN IP via WebRTC host ICE candidates. */
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

    // No STUN — STUN yields your public WAN IP (e.g. 27.x), which must not be the watermark.
    const pc = new RTCPeerConnection({ iceServers: [] });
    const timer = window.setTimeout(finish, 2000);

    try {
      pc.createDataChannel("mms-ip");
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          window.clearTimeout(timer);
          finish();
          return;
        }
        collectCandidateIp(event.candidate, ips);
        if (pickBestIp([...ips])) {
          window.clearTimeout(timer);
          finish();
        }
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
    // Only accept private LAN from API (skip loopback + public WAN).
    if (!isWatermarkIp(ip)) return null;
    return ip;
  } catch {
    return null;
  }
}

/** Resolve and cache the client IP for watermarks (screen + print). */
export async function resolveClientIp(force = false): Promise<string> {
  const cached = getCachedClientIp();
  if (!force && cached) return cached;

  const fromHost = detectIpFromPageHost();
  if (fromHost) {
    setCachedClientIp(fromHost);
    return fromHost;
  }

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
  return "127.0.0.1";
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
