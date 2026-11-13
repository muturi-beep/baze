import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Baze - Vote for the Bangers",
        short_name: "Baze",
        description: "The official Kenyan music chart. Vote for your favorite local artists.",
        theme_color: "#0b0b0f",
        background_color: "#0b0b0f",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // This tells Vite: "Send any /v1 requests to the local backend on port 4001"
      "/v1": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
});