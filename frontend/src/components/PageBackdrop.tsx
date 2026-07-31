/** Army-themed backdrop layer for the main content area. */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/backgrounds/army-backdrop.jpg')] bg-cover bg-bottom bg-no-repeat" />
      {/* Wash the imagery back so form and tile text keeps full contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/62 to-background/35" />
      <div className="absolute inset-0 bg-primary/10" />
    </div>
  );
}
