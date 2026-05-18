import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],

    server: {
      proxy: {
        "/api": {
          target: env.SERVER_URL || "https://80a2-182-9-36-27.ngrok-free.app",

          changeOrigin: true,

          rewrite: (path) => path.replace(/^\/api/, ""),

          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("x-api-key", env.API_KEY || "");
            });
          },
        },
      },
    },
  };
});
