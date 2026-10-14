import { defineConfig, loadEnv } from 'vite';

// SITE_URL is only used for absolute social-image URLs. The domain is still being purchased; override at build time:
//   SITE_URL=https://example.com npm run build
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = (env.SITE_URL || 'https://sheerdavidai.com').replace(/\/$/, '');
  return {
    build: { target: 'es2022', chunkSizeWarningLimit: 4500 },
    plugins: [{ name: 'site-url', transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', site) }],
  };
});
