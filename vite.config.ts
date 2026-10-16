import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const serverEnv = loadEnv(
    mode,
    path.resolve(process.cwd(), "../automate-otp-server"),
    "SERVER_",
  );
  const apiKey = env.VITE_API_KEY || serverEnv.SERVER_API_KEY;

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
              if (apiKey) {
                proxyReq.setHeader("x-api-key", apiKey);
              }
            });
          },
        },
      },
    },
  };
});
