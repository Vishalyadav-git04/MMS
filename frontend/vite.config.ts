import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist",
  },
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
});
