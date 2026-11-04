import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', 'dev-dist', 'coverage'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    // Functional core boundary (research R2): pure, framework-free, no hidden
    // nondeterminism and no implicit locale.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*', 'react-dom/*', 'framework7*', 'dexie*'],
              message: 'src/domain must not import frameworks or storage libraries.',
            },
            {
              // src/domain is flat, so any parent path leaves it.
              regex: '^\\.\\.(/|$)',
              message: 'src/domain may import only from src/domain.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'crypto', 'localStorage', 'indexedDB'].map(
          (name) => ({ name, message: 'src/domain must not use browser or I/O globals.' }),
        ),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Pass the current time in explicitly.' },
        { object: 'Math', property: 'random', message: 'Inject randomness through a port.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Pass the current time in explicitly.',
        },
        {
          selector: "CallExpression[callee.property.name='localeCompare'][arguments.length<2]",
          message: 'Name the locale explicitly (or use compareNames).',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^toLocale(LowerCase|UpperCase|String)$/][arguments.length=0]',
          message: 'Name the locale explicitly.',
        },
      ],
    },
  },
);
