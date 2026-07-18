// Єдиний ESLint (flat config) на весь монорепо: спільна база + окремі правила
// для бекенду (Node) і фронтендів (React). Форматування віддане Prettier.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Що не чіпаємо взагалі.
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.{js,ts,cjs,mjs}',
      'frontend/src/lib/brandLogos.ts', // автозгенерований
      'backend/scripts/**',
      'frontend/scripts/**', // одноразовий dev-інструментарій
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Бекенд: середовище Node ---
  {
    files: ['backend/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // --- Фронтенди: браузер + React ---
  {
    files: ['frontend/**/*.{ts,tsx}', 'admin/**/*.{ts,tsx}', 'crm/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Спільні пом'якшення під стиль проєкту.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Тести: дозволяємо dev-залежності й гнучкіші типи.
  {
    files: ['**/*.test.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },

  prettier, // має бути останнім — вимикає стилістичні правила на користь Prettier
);
