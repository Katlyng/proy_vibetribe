import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Vibe Tribe",
        short_name: "VibeTribe",
        description: "Vibe Tribe - Connect with your tribe",
        start_url: "/",
        display: "standalone",
        background_color: "#0c0c0c",
        theme_color: "#0c0c0c",
        scope: "/",
        icons: [
          {
            src: "images/icon.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "images/icon.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "images/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      pwaAssets: { disabled: false, config: true },
      devOptions: { enabled: true },
    }),
  ],
});
