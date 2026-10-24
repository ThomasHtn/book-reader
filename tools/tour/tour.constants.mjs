/**
 * The app as `tour.sh` serves it, on a port of its own so `make up` can keep its 8000.
 */
export const APP_URL = 'http://localhost:8100';

/**
 * Backoffice key of the tour stack, passed by `tour.sh` (the one of backend/.env, else the demo key).
 */
export const ADMIN_KEY = process.env.TOUR_ADMIN_KEY ?? 'book-reader-demo-admin-key-0123456789';

/**
 * Size of the tour, the same as the other apps' so their READMEs look alike.
 */
export const STAGE_VIEWPORT = { width: 1200, height: 760 };

/**
 * A common phone, at twice the density so the framed screens stay sharp.
 */
export const PHONE_DEVICE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

/**
 * Font tier the screens are taken at, the default one.
 */
export const DEFAULT_TIER = 32;

/**
 * Tier the caregiver picks during the tour.
 */
export const LARGE_TIER = 40;

/**
 * Block of Le Horla where her reading resumes, a few pages in.
 */
export const RESUME_BLOCK = 6;

/**
 * Selector of a title block on "Mes livres", the sign that the list has loaded.
 */
export const BOOK_CARD = 'button.book-card';

/**
 * Page indicator of the reader, filled once the first page is laid out.
 */
export const READER_INDICATOR = '.reader [aria-live]';
