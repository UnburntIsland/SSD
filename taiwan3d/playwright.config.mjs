// playwright.config.mjs — Tier 2 瀏覽器遊玩測試設定
// 用既有的 python http.server 當靜態伺服器(serve 此 taiwan3d/ 目錄);
// 啟用 SwiftShader,讓 headless Chromium 也能建立 WebGL context 跑 three.js。
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    launchOptions: {
      args: [
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'python -m http.server 8080',
    url: 'http://localhost:8080/south.html',
    reuseExistingServer: true,
    timeout: 45000,
  },
});
