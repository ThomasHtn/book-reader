import { NavBarDirection } from './nav-bar.model';

/**
 * Visible label of each bar, next to its arrow.
 */
export const LABELS: Readonly<Record<NavBarDirection, string>> = {
  previous: 'Précédent',
  next: 'Suivant',
  exit: 'Mes livres',
};

/**
 * Default name read by screen readers; `null` when the visible label already says it all.
 */
export const ACCESSIBLE_NAMES: Readonly<Record<NavBarDirection, string | null>> = {
  previous: 'Page précédente',
  next: 'Page suivante',
  exit: null,
};
