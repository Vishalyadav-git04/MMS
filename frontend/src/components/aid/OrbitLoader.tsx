/** Three dots on one rotating parent — reads as a system working, not a generic spinner. */
export function OrbitLoader({ label = "Working" }: { label?: string }) {
  return (
    <span className="mms-orbit" role="status" aria-label={label}>
      <span className="mms-orbit__ring" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}
