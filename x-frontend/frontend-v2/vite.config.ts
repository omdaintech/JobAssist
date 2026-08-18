import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
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
        name: 'One-CEFR Placement Test',
        short_name: 'One-CEFR',
        description: 'AI-powered English placement assessment aligned with the CEFR framework',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'any',
        scope: '/',
        start_url: '/?source=pwa',
        id: 'com.onecefr.student',  // Unique identifier for student app
        categories: ['education', 'productivity'],
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
        enabled: true,
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
        target:
          process.env.DOCKER_ENV === "true"
            ? "http://backend:80" // Docker environment - connect to backend container
            : "http://localhost:93", // Local development - backend on localhost:93
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
