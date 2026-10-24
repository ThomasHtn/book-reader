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
 * Default context read after the visible label; `null` when the label already says it all.
 */
export const CONTEXTS: Readonly<Record<NavBarDirection, string | null>> = {
  previous: 'page précédente',
  next: 'page suivante',
  exit: null,
};
