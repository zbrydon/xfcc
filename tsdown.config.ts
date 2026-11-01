import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  dts: true,
  failOnWarn: true,
  checks: {
    legacyCjs: false,
  },
  publint: true,
  attw: { profile: 'esm-only' },
});
