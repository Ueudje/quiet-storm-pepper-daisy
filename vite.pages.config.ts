import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Static build for GitHub Pages: https://ueudje.github.io/quiet-storm-pepper-daisy/ */
export default defineConfig({
  root: resolve(__dirname, "site"),
  publicDir: resolve(__dirname, "public"),
  base: "/quiet-storm-pepper-daisy/",
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir: resolve(__dirname, "site-dist"),
    emptyOutDir: true,
  },
});
