import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        google3d: resolve(process.cwd(), "google-3d.html")
      }
    }
  }
});