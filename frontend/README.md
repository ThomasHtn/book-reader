# Book Reader frontend

The Liseuse itself: an Angular app built for one reader with low vision, and the backoffice her
caregiver uses to fill her shelf.

## Start

From the frontend folder, the first time:

```bash
npx npm@11 install
```

Then every day, with the backend running:

```bash
npm start
```

The app opens on http://localhost:4200 and talks to the API on port 8080.

## Before committing

```bash
npm run fix
npm run test:ci
```

The first one fixes lint and formatting, the second runs the tests once with the coverage floors.

## Tests while coding

```bash
npm test
```

## Browser tests

They drive the real app from its images. Once, install the browser:

```bash
npx playwright install chromium
```

Then, on an empty library:

```bash
make -C .. reset up
npm run e2e
```

## Where code goes

```text
core/     data access, models, pure functions: http, reader state, admin session, updates
shared/   reusable components, one folder each: book card, command bar, head line, status screen
pages/    one folder per screen: start, library, reader (with its pagination), admin
```

Imports roll downhill only: a page may use shared and core, shared may use core, core uses neither. A
page never imports another page. To reach another folder, use the @core, @shared or @pages aliases.
ESLint catches anyone climbing back up.

The reader paginates one chapter at a time in CSS columns (specification 5.2): the arithmetic is pure
(`pages/reader/pagination/*.utils.ts`), and every DOM measurement sits behind ChapterLayout, whose
`Range`-based DomChapterLayout can only be checked in a real browser.

## Styles

Tailwind classes in the template, for layout only. Everything visual goes in the component's .scss, in
BEM classes on the design tokens, never raw values:

```scss
@use 'tools' as *;

/* Chevron drawn as a stroke in the text colour. */
.nav-bar__arrow {
  width: var(--nav-bar-arrow-size);
  stroke: currentcolor;

  /* On phones the chevrons give way to the labels. */
  @include phone {
    display: none;
  }
}
```

Three global files only: `styles/tokens.css` (copied from `docs/design-system/tokens.css`),
`styles/base.css`, and `styles/reading.css` for the book text, which DomChapterLayout writes outside any
template. The backoffice shares its `a-*` primitives through the Sass partials of `pages/admin/styles/`,
loaded unscoped by the admin shell.

## Pitfalls

**npm install crashes**: npm 10.9 trips on jsdom. Use npx npm@11 install.

**A spec waits forever**: specs that answer HTTP requests settle with `TestBed.tick()` and a macrotask,
never `whenStable()`, which waits for those very requests.

**A poll loses the list**: ReaderData keeps the last valid responses with an effect-fed signal; a lazy
`linkedSignal` loses the list when a poll fails before anyone read it.

**page.route sees nothing**: the service worker answers the requests first. The Playwright config blocks
it; keep it that way.
