import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    viteSingleFile(),
  ],
  define: {
    global: {},
  },
  build: {
    target: "esnext",
    minify: "oxc",
    sourcemap: false,
    assetsInlineLimit: Infinity,
    reportCompressedSize: false,
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src")
    },
  }
});
