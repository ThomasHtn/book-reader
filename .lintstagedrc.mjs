import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Repository root, so every tool runs from a fixed path whatever the hook's working directory.
 */
const ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Path of a frontend command-line tool; the frontend owns the only `node_modules`.
 */
const bin = (name) => join(ROOT, 'frontend', 'node_modules', '.bin', name);

/**
 * Staged paths as shell arguments.
 */
const args = (files) => files.map((file) => `"${file}"`).join(' ');

/**
 * Staged paths as the comma-separated regexes `-DspotlessFiles` expects.
 */
const spotlessFiles = (files) =>
  files.map((file) => file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(',');

/**
 * Fixers run on staged files before each commit (installed by `npm install`, see README).
 * Each tool picks its own configuration next to the file, so the rules are the CI ones.
 */
export default {
  'frontend/**/*.{ts,html}': (files) => [
    `${bin('eslint')} --fix ${args(files)}`,
    `${bin('prettier')} --write ${args(files)}`,
  ],
  'frontend/src/**/*.css': (files) => [
    `${bin('stylelint')} --fix ${args(files)}`,
    `${bin('prettier')} --write ${args(files)}`,
  ],
  'frontend/*.{js,mjs}': (files) => `${bin('prettier')} --write ${args(files)}`,
  'backend/src/**/*.{java,sql,properties}': (files) =>
    `${join(ROOT, 'backend', 'mvnw')} -q -f ${join(ROOT, 'backend', 'pom.xml')} spotless:apply -DspotlessFiles=${spotlessFiles(files)}`,
};
