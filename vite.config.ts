import { defineConfig } from "vite";

/**
 * Configuración explícita para build de producción (Vercel detecta Vite por `vite build`).
 * Los activos de `public/` se copian a la raíz de `dist/`.
 */
export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 6000
  },
  publicDir: "public"
});
