import { useEffect, useState } from "react";

/**
 * Shrinks the glass header once either window or the main content pane scrolls
 * past `threshold` px. Listens on both — antd/content panes can own scroll on
 * short screens (design-system gotcha).
 */
export function useShrinkOnScroll(
  threshold = 12,
  contentSelector = ".mms-content",
) {
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const read = () => {
      const pane = document.querySelector(contentSelector);
      const paneTop = pane instanceof HTMLElement ? pane.scrollTop : 0;
      const winTop = window.scrollY || document.documentElement.scrollTop;
      setShrunk(Math.max(paneTop, winTop) > threshold);
    };

    read();
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", read, opts);
    const pane = document.querySelector(contentSelector);
    pane?.addEventListener("scroll", read, opts);
    return () => {
      window.removeEventListener("scroll", read);
      pane?.removeEventListener("scroll", read);
    };
  }, [threshold, contentSelector]);

  return shrunk;
}
