import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "offline.html"],
      manifest: {
        name: "Zulla Logistics",
        short_name: "Zulla",
        description: "Freight brokerage. Without the friction.",
        theme_color: "#0A0B0D",
        background_color: "#0A0B0D",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // App bundle is over the default 2MB cap because of Mapbox + Recharts.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          // API requests: try network first with a short timeout, fall back to
          // cache only as a last resort. urlPattern matches any /api/ host so
          // it works regardless of whether the API is at the Railway domain
          // or a custom domain in future.
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
            options: { cacheName: "api-cache" },
          },
        ],
        // SPA navigation fallback: serve the precached app shell for any
        // navigation request that misses the precache. React Router handles
        // routing client-side from there. Without this (or with a wrong
        // value) the SW will hand back offline.html on every deep link, even
        // when the user is online.
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz/, /^\/readyz/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  // `vite preview` is what Railway's start command uses for the web service.
  // By default Vite preview returns 403 for requests whose Host header isn't
  // on its allowlist. Set allowedHosts to `true` so the Railway edge proxy
  // (which sets Host: <service>.up.railway.app) can serve the SPA.
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
