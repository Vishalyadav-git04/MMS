// Shared TanStack Start Vite preset already includes the following — do NOT add them
// manually or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, and error logger plugins.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";


export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Proxy API calls directly to the MMS FastAPI service (backend on :8000).
  vite: {
    server: {
      port: 3000,
      proxy: {
        ...Object.fromEntries(
          ["/auth", "/health", "/upload", "/dashboard", "/mms", "/ep", "/mlccs", "/ro", "/transfer", "/unit-holding"].map(
            (path) => [path, { target: "http://localhost:8000", changeOrigin: true, xfwd: true }]
          )
        ),
      },
    },
  },
});
