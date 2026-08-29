import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Output to dist/ (Netlify publish dir)
    outDir: "dist",
    // Emit a sourcemap for easier debugging on Netlify
    sourcemap: false,
    // Raise the chunk-size warning threshold slightly (d3 is large)
    chunkSizeWarningLimit: 600,
  },

  server: {
    // Local dev only — forward /api to the Express backend so the Groq key
    // never reaches the browser. In production the frontend talks directly to
    // the Render URL via VITE_API_BASE_URL.
    proxy: {
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
  },
});
