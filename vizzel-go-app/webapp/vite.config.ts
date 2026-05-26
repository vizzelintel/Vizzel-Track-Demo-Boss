import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const apiProxy = {
  target: "http://localhost:8080",
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/link": path.resolve(__dirname, "./src/shims/next-link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/shims/next-navigation.ts"),
      "next/image": path.resolve(__dirname, "./src/shims/next-image.tsx"),
      "next-auth/react": path.resolve(__dirname, "./src/shims/next-auth-shim.ts"),
      "next-themes": path.resolve(__dirname, "./src/shims/theme-provider.tsx"),
    },
  },
  build: {
    outDir: "../internal/spa/dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("@tanstack")) return "table";
            if (id.includes("exceljs")) return "excel";
            if (id.includes("lucide-react")) return "icons";
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": apiProxy,
      "/auth": apiProxy,
      "/asset": apiProxy,
      "/dashboard": apiProxy,
      "/user": apiProxy,
      "/organization": apiProxy,
      "/withdrawal": apiProxy,
      "/checkJob": apiProxy,
      "/warranty": apiProxy,
      "/superAdmin": apiProxy,
      "/facility": apiProxy,
    },
  },
});
