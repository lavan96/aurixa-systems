import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Everything used to land in one ~936 KB chunk that Vite warned
          // about on every build. Splitting the vendors out matters more here
          // than the raw number suggests: they change far less often than the
          // site does, so a copy deploy leaves them cached instead of making
          // every visitor re-download React and the icon set to read a reworded
          // paragraph. The route-level `React.lazy` calls in App.tsx do the
          // rest, keeping Pricing and Questionnaire — 4,000 lines between them,
          // both unlisted — out of the entry chunk entirely.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react-router') || id.includes('/remix-run/')) return 'vendor-router';
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (id.includes('node_modules/motion') || id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            // Everything else in node_modules is small enough (clsx,
            // tailwind-merge) that a catch-all 'vendor' chunk came out empty
            // and only added a file. Let Rollup place them.
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
