import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),  // Ensures index.html is included
        background: resolve(__dirname, "public/background.js")  // Fixes background.js issue
      },
    },
  },
});
