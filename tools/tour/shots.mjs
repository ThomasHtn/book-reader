/**
 * Takes the phone screenshots of the README strip, raw: frame_screens.py draws the phone around them.
 * Usage: node shots.mjs <out dir>
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  APP_URL,
  BOOK_CARD,
  DEFAULT_TIER,
  PHONE_DEVICE,
  READER_INDICATOR,
} from './tour.constants.mjs';
import { bookId, chromium, CATALOGUE_RESULTS, openContext } from './tour.utils.mjs';

/**
 * Where the raw screenshots land, one PNG per screen.
 */
const OUT_DIR = process.argv[2];

if (!OUT_DIR) throw new Error('Usage: node shots.mjs <out dir>');
mkdirSync(OUT_DIR, { recursive: true });

/**
 * One browser for every screen.
 */
const browser = await chromium.launch();

/**
 * A phone with her progress and the backoffice key seeded.
 */
const context = await openContext(browser, { ...PHONE_DEVICE, reducedMotion: 'reduce' });

/**
 * The single tab every screen is taken in.
 */
const page = await context.newPage();

/**
 * Saves the page as `<name>.png`, after the fonts and the UI have settled.
 */
async function shoot(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`) });
}

await page.goto(`${APP_URL}/lire/${await bookId('Le Horla')}`);
await page.locator(READER_INDICATOR).filter({ hasText: /sur/ }).waitFor();
await shoot('reading');

await page.goto(`${APP_URL}/livres`);
await page.locator(BOOK_CARD).first().waitFor();
await shoot('books');

await page.goto(`${APP_URL}/admin/catalogue`);
await page.getByPlaceholder('Titre ou auteur').fill('Maupassant');
await page.locator('button[type="submit"]').click();
await page.locator('.a-card').nth(CATALOGUE_RESULTS.length - 1).waitFor();
await shoot('catalogue');

await page.goto(`${APP_URL}/admin/reglages`);
await page.getByRole('button', { name: String(DEFAULT_TIER) }).waitFor();
await shoot('settings');

await browser.close();
