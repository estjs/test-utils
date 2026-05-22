import { defineConfig } from 'tsup';

export default defineConfig({
  entryPoints: {
    'test-utils': './src/index.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
  target: 'es2020',
  platform: 'browser',
  dts: true,
  shims: true,
  clean: true,
  treeshake: true,
  cjsInterop: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  tsconfig: './tsconfig.json',
  // Peer/runtime deps that consumers install themselves — keep them out of
  // the bundle so versions don't drift and tree-shaking stays predictable.
  external: [
    'essor',
    '@estjs/signals',
    '@estjs/template',
    '@testing-library/dom',
    '@testing-library/user-event',
  ],
  outExtension({ format }) {
    return { js: `.${format}.js` };
  },
});
