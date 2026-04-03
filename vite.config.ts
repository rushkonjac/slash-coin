import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // 开发用根路径；打包用相对路径，GitHub Pages（/repo/）与本地直接打开 dist 都能加载资源
  base: command === "build" ? "./" : "/",
}));
