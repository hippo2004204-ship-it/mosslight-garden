import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project beneath the repository name.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/mosslight-garden/' : '/',
});
