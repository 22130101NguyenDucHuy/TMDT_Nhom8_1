import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "production" && viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
    }),
    mode === "production" && viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    target: "baseline-widely-available",
    sourcemap: mode === "production" ? "hidden" : true,
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react-router-dom"],
        },
      },
    },
  },

  esbuild: mode === "production" ? {
    drop: ["console", "debugger"],
    legalComments: "none",
  } : undefined,

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },

  server: {
    port: 3000,
  },
}));
