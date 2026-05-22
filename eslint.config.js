import { estjs } from '@estjs/eslint-config';

const base = estjs({});

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/*.md',
      'docs/**',
      'CHANGELOG.md',
      '.github/**',
    ],
  },
  ...(Array.isArray(base) ? base : [base]),
];
