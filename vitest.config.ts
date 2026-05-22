import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
const dirname = resolve();
export default defineConfig({
  resolve: {
    alias: {
      '@/': `${resolve(dirname, 'src')}/`,
    },
    // essor's package.json `exports.node` points at the SSR build which
    // omits `createComponent`. In tests we run jsdom — pretend we're a
    // browser so the right entry is resolved.
    conditions: ['browser', 'development', 'import', 'module', 'default'],
  },
  define: {
    __DEV__: true,
    __BROWSER__: true,
  },
  test: {
    coverage: {
      provider: 'v8',
      exclude: ['playground/**/*'],
      reporter: ['text', 'json', 'html'],
    },
    globals: true,
    environment: 'jsdom',
    watch: false,
  },
});
