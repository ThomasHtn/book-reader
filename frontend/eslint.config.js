// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
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
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // Every member states its visibility, so the public surface of a class is explicit rather
      // than inferred from the absence of a keyword.
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],

      // Keeps declaration order predictable: state first, then the constructor, then behaviour.
      // Deliberately not ordered by accessibility, because `inject()`-initialized fields must be
      // declared before the public signals derived from them.
      '@typescript-eslint/member-ordering': [
        'error',
        { default: { memberTypes: ['signature', 'field', 'constructor', 'method'] } },
      ],

      // Diagnostics are fine; stray debug logging is not.
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Static images go through NgOptimizedImage.
      '@angular-eslint/template/prefer-ngsrc': 'error',

      // Buttons always declare their type so they never submit a surrounding form by accident.
      '@angular-eslint/template/button-has-type': 'error',

      // Native control flow only; no residual structural directives.
      '@angular-eslint/template/prefer-control-flow': 'error',

      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
    },
  },
]);
