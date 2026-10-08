/**
 * Class names: kebab-case blocks, with optional BEM `--modifier` and `__element` parts.
 */
const CLASS_NAME =
  /^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/;

/**
 * Stylelint rules: the standard set, plus the project's naming conventions.
 */
export default {
  extends: ['stylelint-config-standard'],
  // Copied verbatim from docs/design-system/tokens.css, which stays the source of truth.
  ignoreFiles: ['src/styles/tokens.css'],
  rules: {
    'selector-class-pattern': [
      CLASS_NAME,
      { message: 'Class names are kebab-case, with optional BEM __element and --modifier.' },
    ],
    // Partials are imported by relative path, as plain strings.
    'import-notation': 'string',
    // Components are ordered by role, not by specificity; reordering them would change the cascade.
    'no-descending-specificity': null,
  },
};
