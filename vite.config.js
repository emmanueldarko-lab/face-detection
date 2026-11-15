import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, forward /api calls to the Node backend so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": { target: "http://127.0.0.1:5000", changeOrigin: true } }
  }
});
