import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {resolve} from "path";
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", // ✅ Correct worker file
          dest: "workers", // ✅ Places it in dist/workers/
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"), // Ensures index.html is included
        background: resolve(__dirname, "public/background.js"), // Fixes background.js issue
      },
    },
  },
});
