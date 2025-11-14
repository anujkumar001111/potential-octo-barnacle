import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve('electron/main/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vite',
        'electron',
        ...[
          'electron-log',

          // electron-log uses fs internally
          'fs',
          'util',
        ],
        'node:module',
        /\.node$/,
        // Add all Node.js built-in modules as external
        'node:fs',
        'node:path',
        'node:url',
        'node:util',
        'node:stream',
        'node:events',
        'node:child_process',
        'node:process',
        'node:buffer',
        'fs',
        'fs/promises',
        'path',
        'child_process',
        'glob',
        'electron-store',
        '@remix-run/node',
        '@nut-tree/nut-js',
        'sharp', // Native image processing library
        'crypto', // Node.js crypto module
        'uuid', // UUID generation library
        '@eko-ai/eko', // Eko AI framework
        /^@eko-ai\//, // All @eko-ai packages

        // "mime", // NOTE: don't enable. not working if it's external.
        'electron-updater',
      ],
      output: {
        dir: 'dist/electron',
        entryFileNames: 'main/[name].mjs',
        format: 'esm',
      },
    },
    minify: false,
    emptyOutDir: false,
  },
});
