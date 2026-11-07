import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
