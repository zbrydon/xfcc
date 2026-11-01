import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc', 'import', 'node', 'vitest'],
  categories: {
    correctness: 'error',
    suspicious: 'error',
    perf: 'error',
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  env: {
    builtin: true,
    node: true,
  },
  ignorePatterns: ['dist', 'coverage', 'fuzz', 'node_modules'],
  rules: {
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-console': 'error',
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-param-reassign': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'typescript/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    'typescript/no-explicit-any': 'error',
    'typescript/no-floating-promises': 'error',
    'typescript/no-non-null-assertion': 'error',
    'typescript/no-unsafe-argument': 'error',
    'typescript/no-unsafe-assignment': 'error',
    'typescript/no-unsafe-call': 'error',
    'typescript/no-unsafe-member-access': 'error',
    'typescript/no-unsafe-return': 'error',
    'typescript/strict-boolean-expressions': 'error',
    'typescript/switch-exhaustiveness-check': 'error',
  },
  overrides: [
    {
      files: ['bench/**/*.bench.ts'],
      rules: { 'vitest/expect-expect': 'off', 'vitest/valid-title': 'off' },
    },
  ],
});
