import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), tailwindcss()],

    server: {
      proxy: {
        "/api": {
          target: env.VITE_SERVER_URL || "http://localhost:3000",

          changeOrigin: true,

          rewrite: (path) => path.replace(/^\/api/, ""),

          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.VITE_API_KEY) {
                proxyReq.setHeader("x-api-key", env.VITE_API_KEY);
              }
            });
          },
        },
      },
    },
  };
});
