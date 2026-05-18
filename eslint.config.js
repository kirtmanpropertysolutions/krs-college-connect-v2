import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Three lint contexts in this repo, each with different ambient globals:
//   1. Browser (default) — React/Vite source under src/
//   2. Node — Vercel serverless functions under api/, build/dev scripts
//      under scripts/, and vite.config.js. All run in Node, so `process`,
//      `Buffer`, `__dirname`, etc. should be globals, not undefined.
//   3. Service Worker — public/sw.js runs in a ServiceWorkerGlobalScope
//      with its own self/clients/skipWaiting/registration globals.

export default defineConfig([
  globalIgnores(['dist']),

  // ── Browser (React source) ─────────────────────────────────────────
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        // Function args that match the same capital-letter-or-underscore
        // convention (e.g. JSX components passed as props like `Icon`,
        // intentionally-ignored args like `_school`) are tolerated. Without
        // this, the bare eslint parser flags JSX-only references as unused
        // because it doesn't model `<Icon />` as a use of `Icon`.
        argsIgnorePattern: '^[A-Z_]',
      }],
    },
  },

  // ── Node (serverless functions, scripts, vite config) ──────────────
  {
    files: ['api/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // ── Service worker ─────────────────────────────────────────────────
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.serviceworker },
      sourceType: 'script',
    },
  },
])
