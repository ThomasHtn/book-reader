/**
 * Films the tour: drives stage.html around two live copies of the app and screenshots it in a loop.
 * Usage: node record.mjs <out dir>, then encode_tour.py turns <out dir> into the animated WebP.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APP_URL,
  BOOK_CARD,
  LARGE_TIER,
  READER_INDICATOR,
  STAGE_VIEWPORT,
} from './tour.constants.mjs';
import { chromium, openContext } from './tour.utils.mjs';

/**
 * Where the frames and their timings land.
 */
const OUT_DIR = process.argv[2];

/**
 * Served on the app's origin, so the stage can reach into both iframes.
 */
const STAGE_URL = `${APP_URL}/__tour`;

if (!OUT_DIR) throw new Error('Usage: node record.mjs <out dir>');
mkdirSync(join(OUT_DIR, 'frames'), { recursive: true });

/**
 * One browser for the whole take.
 */
const browser = await chromium.launch();

/**
 * Context at the size of the final video, with her progress and the backoffice key seeded.
 */
const context = await openContext(browser, { viewport: STAGE_VIEWPORT });
await context.route(STAGE_URL, (route) =>
  route.fulfill({
    contentType: 'text/html',
    body: readFileSync(new URL('./stage.html', import.meta.url), 'utf8'),
  }),
);

/* The app forbids being framed (CSP frame-ancestors, X-Frame-Options); only this copy lifts it, for the two iframes. */
await context.route(`${APP_URL}/**`, async (route) => {
  const request = route.request();
  if (request.resourceType() !== 'document' || request.url() === STAGE_URL) {
    return route.fallback();
  }
  const response = await route.fetch();
  const headers = { ...response.headers() };
  delete headers['content-security-policy'];
  delete headers['x-frame-options'];
  return route.fulfill({ response, headers });
});

/**
 * The stage, filmed as a whole.
 */
const page = await context.newPage();
await page.goto(STAGE_URL);
await page.evaluate(() => document.fonts.ready);

/**
 * The app in the browser window: her PC.
 */
const desktop = page.frameLocator('#desktop-frame');

/**
 * The app in the phone: the caregiver's.
 */
const phone = page.frameLocator('#phone-frame');

/* Both apps load before the first frame, so no loading screen is ever filmed. */
await page.evaluate((url) => {
  document.getElementById('desktop-frame').src = `${url}/livres`;
  document.getElementById('phone-frame').src = `${url}/admin/reglages`;
}, APP_URL);
await desktop.locator(BOOK_CARD).first().waitFor();
await phone.getByRole('button', { name: String(LARGE_TIER) }).waitFor();
await page.waitForTimeout(800);

/**
 * Screenshots with the time each was taken, so playback keeps the real pace.
 */
const frames = [];

/**
 * Cleared once the last scene is over.
 */
let recording = true;

/**
 * Set while a wait is cut out of the film, such as the reader's ten-second poll.
 */
let paused = false;

/**
 * Screenshots as fast as the browser allows, alongside the scenes below; the first frame after a
 * pause is marked as a cut, so the pause takes no time on screen.
 */
const capture = (async () => {
  let cut = false;
  while (recording) {
    if (paused) {
      cut = true;
      await page.waitForTimeout(40);
      continue;
    }
    frames.push({ buffer: await page.screenshot({ type: 'png' }), at: Date.now(), cut });
    cut = false;
  }
})();

/**
 * Lets a scene breathe.
 */
const wait = (ms) => page.waitForTimeout(ms);

/**
 * Calls one of the stage's window.tour methods.
 */
const stage = (method, ...args) =>
  page.evaluate(([name, values]) => window.tour[name](...values), [method, args]);

/* 1. The problem. */
await stage('show', 'intro');
await wait(4200);

/* 2. Her books, on her PC. */
await stage('caption', 'Her books', 'Each book <em>has its colour.</em>', '');
await stage('layout', 'desktop');
await stage('show', 'scene');
await wait(3400);
await stage('tap', 'desktop', BOOK_CARD, 0);
await desktop.locator(READER_INDICATOR).filter({ hasText: /sur/ }).waitFor();

/* 3. Reading: two facing pages, three commands. */
await stage('caption', 'Reading', 'Two pages. <em>Three commands.</em>', '');
await wait(3600);
await stage('tap', 'desktop', '.nav-bar--next', 0);
await wait(2600);
await stage('tap', 'desktop', '.nav-bar--next', 0);
await wait(2600);
await stage('tap', 'desktop', '.nav-bar--prev', 0);
await wait(2600);

/* 4. The caregiver makes the text larger, from her phone. */
await stage(
  'caption',
  'From afar',
  'Too small?<br><em>Fix it from your phone.</em>',
  'The caregiver picks the text size in the backoffice. Nothing to touch on her PC.',
);
await stage('layout', 'phone');
await wait(2600);
await stage('tap', 'phone', '.a-seg button', 3);
await wait(1400);
await stage('tap', 'phone', '.a-btn--primary', 0);
await wait(2000);

/* 5. Her screen follows, at the same page; the wait for the poll is cut out. */
await stage('caption', 'Live', 'Her page <em>follows.</em>', '');
await stage('layout', 'desktop');
await wait(1400);
paused = true;
await page.waitForFunction(
  (tier) =>
    document.getElementById('desktop-frame').contentDocument.documentElement.dataset.tier ===
    String(tier),
  LARGE_TIER,
  { timeout: 20_000 },
);
await wait(800);
paused = false;
await wait(3600);

/* 6. New books from the free catalogue, on the phone. */
await page.evaluate((url) => {
  document.getElementById('phone-frame').src = `${url}/admin/catalogue`;
}, APP_URL);
await phone.getByPlaceholder('Titre ou auteur').waitFor();
await stage(
  'caption',
  'New books',
  'Thousands of classics.<br><em>One tap each.</em>',
  'The free Ebooks libres et gratuits catalogue, searched live. Or an EPUB of your own.',
);
await stage('layout', 'phone');
await wait(2000);
await phone.getByPlaceholder('Titre ou auteur').pressSequentially('Maupassant', { delay: 110 });
await wait(500);
await stage('tap', 'phone', 'button[type="submit"]', 0);
await wait(3800);

/* 7. The way out. */
await stage('layout', 'none');
await stage('show', 'outro');
await wait(4600);

recording = false;
await capture;
await browser.close();

/**
 * How long each frame stays on screen: until the next one was taken, or one frame's time before a cut.
 */
const timings = frames.map(({ at }, index) => {
  const next = frames[index + 1];
  return (next && !next.cut ? next.at : at + 70) - at;
});
frames.forEach(({ buffer }, index) =>
  writeFileSync(join(OUT_DIR, 'frames', `${String(index).padStart(5, '0')}.png`), buffer),
);
writeFileSync(join(OUT_DIR, 'timings.json'), JSON.stringify(timings));
console.log(`${frames.length} frames, ${(timings.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} s`);
