// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "lib/main.ts"),
      name: "WebAV SDK JS",
      // the proper extensions will be added
      fileName: "@webtender/webav-sdk-js",
    },
    rollupOptions: {},
  },
});
