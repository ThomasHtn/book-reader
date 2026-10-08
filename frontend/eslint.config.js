// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const jsdoc = require('eslint-plugin-jsdoc');
const simpleImportSort = require('eslint-plugin-simple-import-sort');

/**
 * Declarations that must carry a JSDoc block, on top of classes, functions and methods (constructors
 * included). Exported constants are matched on the `export` node, where their comment sits.
 */
const DOCUMENTED_DECLARATIONS = [
  'PropertyDefinition',
  'TSInterfaceDeclaration',
  'TSPropertySignature',
  'TSMethodSignature',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
  'Program > VariableDeclaration',
  'ExportNamedDeclaration:has(> VariableDeclaration)',
  'ExportDefaultDeclaration',
];

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    plugins: { jsdoc, 'simple-import-sort': simpleImportSort },
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

      // Every declaration is documented, so a newcomer never meets an unexplained name.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          // The fixer would insert empty blocks; a missing comment is written by hand.
          enableFixer: false,
          require: { ClassDeclaration: true, FunctionDeclaration: true, MethodDefinition: true },
          contexts: DOCUMENTED_DECLARATIONS,
        },
      ],

      // One layout for every block: `/**`, one line of text, ` */`. Auto-fixed by `npm run fix`.
      'jsdoc/multiline-blocks': ['error', { noSingleLineBlocks: true }],
      'jsdoc/no-blank-blocks': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/no-multi-asterisks': 'error',

      // TypeScript carries the types; JSDoc carries the intent.
      'jsdoc/no-types': 'error',

      // One stable import order, fixed by `npm run fix`: Angular, libraries, aliases, relatives.
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^\\u0000'], ['^@angular/'], ['^@?\\w'], ['^@(core|shared|pages)/'], ['^\\.']],
        },
      ],
      'simple-import-sort/exports': 'error',
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
