import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/birthday-video-website/",

  publicDir: "public",

  build: {
    outDir: "dist",
    emptyOutDir: true,

    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        login: resolve(process.cwd(), "login.html"),
        gallery: resolve(process.cwd(), "gallery.html"),
      },
    },
  },
});
