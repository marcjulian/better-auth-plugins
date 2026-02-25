import { defineConfig } from 'tsdown';

export default defineConfig({
  // exports: true,
  entry: ['./src/index.ts', './src/client.ts'],
  sourcemap: true,
});
