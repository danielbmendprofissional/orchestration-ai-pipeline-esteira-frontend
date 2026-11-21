// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  // Gerado por `npm run generate:api-types` e nunca editado à mão: o estilo é o do gerador.
  { ignores: ['src/app/core/api/*.d.ts'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'est',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'est',
          style: 'kebab-case',
        },
      ],
      // F0.5, critério 9: nenhum token, cookie ou dado de sessão no navegador (BFF, ADR-0004).
      'no-restricted-globals': [
        'error',
        ...['localStorage', 'sessionStorage', 'indexedDB', 'cookieStore', 'caches'].map((name) => ({
          name,
          message: 'Nada de sessão no navegador: o BFF guarda tudo no servidor (ADR-0004).',
        })),
      ],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].flatMap((object) =>
          ['localStorage', 'sessionStorage', 'indexedDB', 'cookieStore', 'caches'].map((property) => ({
            object,
            property,
            message: 'Nada de sessão no navegador: o BFF guarda tudo no servidor (ADR-0004).',
          })),
        ),
        {
          object: 'document',
          property: 'cookie',
          message: 'O cookie esteira_session é HttpOnly; o front nunca lê nem escreve cookie (ADR-0004).',
        },
      ],
    },
  },
  {
    // Componentes spartan (helm) copiados para shared/ui mantêm o prefixo hlm da biblioteca.
    files: ['src/app/shared/ui/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: ['est', 'hlm'], style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: ['est', 'hlm'], style: 'kebab-case' }],
      // O helm gerado expõe `class` como alias de input (ex.: `userClass`); é a API da biblioteca.
      '@angular-eslint/no-input-rename': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
