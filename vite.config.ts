import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { configDotenv } from "dotenv";

configDotenv();

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      "/api": {
        target: process.env.SERVER_URL || "http://localhost:3000",

        changeOrigin: true,

        rewrite: (path) => path.replace(/^\/api/, ""),

        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("x-api-key", process.env.API_KEY || "");
          });
        },
      },
    },
  },
});
