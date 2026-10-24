# README tour

Films the animated tour (`docs/media/tour.webp`) and takes the phone screens (`docs/media/screen-*.png`) of the root README, from the real app on public-domain books.

```bash
tools/tour/tour.sh
```

About three minutes, most of it building the images. Then look at the new media and commit them.

## What it needs

- Docker, as for `make up`.
- Playwright's Chromium (`cd frontend && npx playwright install chromium`) and Node 22.18 or later, which runs the e2e EPUB builder (TypeScript) as is.
- Python 3 with Pillow, built with WebP support.
- Port 8100 free. A running `make up` or `make db` can stay up: the tour stack has its own project name, database and port.

## What it does

1. Builds the images of `compose.yaml` and starts them as the `book-reader-tour` project (`compose.tour.yaml`: app on 8100, database not published), with the backoffice key of `backend/.env` when there is one.
2. `seed.mjs` uploads eight books through the backoffice API: *Le Horla* and *Amour* with their real text (from `frontend/e2e/support`), six other public-domain titles to fill the shelf.
3. `record.mjs` films `stage.html`: title cards, captions, and the app in a browser (her PC) and a phone (the caregiver's), clicked through like a visitor would. The wait for the reader's ten-second poll is cut out. `encode_tour.py` turns the frames into a 15 fps WebP, about 2.5 MB.
4. `seed.mjs` again resets the text size, then `shots.mjs` takes the phone screens and `frame_screens.py` draws the phone around them.
5. Stops the stack and drops its database, even on a failure (the logs of a failed run are kept, the path is printed).

The development database and the catalogue site are never touched: catalogue searches are answered by the browser itself (`CATALOGUE_RESULTS` in `tour.utils.mjs`). The app forbids being framed; only the tour's browser lifts that header, for the stage's two iframes.

## Changing it

| To change                        | Edit                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| The books on the shelf           | `seed.mjs` (public domain only: the media are public)                  |
| Her progress, catalogue results  | `tour.utils.mjs`                                                       |
| The scenes, captions, clicks     | `record.mjs`, and `stage.html` for the cards and the look              |
| Which screens the README shows   | `shots.mjs`, then the `<img>` strip of the root README                 |
| Frame rate, quality, phone shape | the constants at the top of `encode_tour.py` and `frame_screens.py`    |
| Port, sizes, text sizes          | `tour.constants.mjs`, and `compose.tour.yaml` for the port             |

The scenes click through the app's own classes (`.book-card`, `.nav-bar--next`, `.a-seg button`...): a renamed class breaks the take, and the error names it.
