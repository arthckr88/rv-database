import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "1" ? "/rv-database/" : "/",
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
});
