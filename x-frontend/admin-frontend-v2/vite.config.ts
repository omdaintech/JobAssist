import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

// Determine backend target based on environment
const isDockerEnv = process.env.DOCKER_ENV === "true";
const backendTarget = isDockerEnv
  ? "http://backend:80" // Docker: use service name and internal port
  : "http://localhost:93"; // Local: use localhost with correct backend port

console.log(
  `Admin Frontend Vite Config: ${
    isDockerEnv ? "Docker" : "Local"
  } mode, backend target: ${backendTarget}`
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Disable workbox console logs for cleaner development experience
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Suppress workbox router logs
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg', 'favicon.svg'],
      manifest: {
        name: 'One-CEFR Admin',
        short_name: 'One-CEFR Admin',
        description: 'Admin dashboard for managing the One-CEFR placement test platform',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'any',
        scope: '/',
        start_url: '/?source=pwa',
        id: 'com.onecefr.admin',
        categories: ['productivity', 'business'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        screenshots: []
      },
      devOptions: {
        enabled: false, // Disable PWA in development for cleaner console
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 80,
    host: "0.0.0.0", // Allow connections from Docker
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Admin Frontend Proxy Error:", err);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log(
              `Admin Frontend Proxying: ${req.method} ${req.url} -> ${backendTarget}${req.url}`
            );
          });
        },
      },
    },
  },
});
