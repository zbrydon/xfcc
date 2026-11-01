import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  sortPackageJson: true,
  sortImports: {
    ignoreCase: false,
    groups: [
      'builtin',
      'external',
      'parent',
      'sibling',
      'index',
      ['internal', 'subpath', 'unknown'],
    ],
  },
  ignorePatterns: [
    'dist',
    'coverage',
    'pnpm-lock.yaml',
    '.changeset/*.md',
    'test/fixtures',
    'fuzz/corpus',
    'fuzz/seeds',
    'fuzz/artifacts',
  ],
});
