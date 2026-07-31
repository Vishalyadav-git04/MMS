import { QueryClient } from "@tanstack/react-query";
import {
  createBrowserHistory,
  createRouter,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Drop a bare `?` with no params (e.g. `/?` → `/`, `/?#x` → `/#x`). */
function stripBareQuestionMark(href: string): string {
  return href.replace(/\?(?=#|$)/, "");
}

function cleanBrowserUrl() {
  if (typeof window === "undefined") return;
  const relative = window.location.href.slice(window.location.origin.length);
  const cleaned = stripBareQuestionMark(relative);
  if (cleaned !== relative) {
    window.history.replaceState(window.history.state, "", cleaned);
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Browser can show `/?` while location.search is "" — history then sees `/`
  // and never rewrites the bar. Clean on load and when writing hrefs.
  cleanBrowserUrl();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(typeof document !== "undefined"
      ? {
          history: createBrowserHistory({
            createHref: (href) => stripBareQuestionMark(href),
          }),
        }
      : {}),
  });

  if (typeof document !== "undefined") {
    router.subscribe("onResolved", cleanBrowserUrl);
  }

  return router;
};
