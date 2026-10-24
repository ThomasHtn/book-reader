import { PageCommand } from '@core/reader/reader.model';

/**
 * Which bar it is: a page turn, or the way back to "Mes livres".
 */
export type NavBarDirection = PageCommand | 'exit';
