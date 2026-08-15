# Working in this repo

Notes for Claude Code (and for anyone else picking this up). The README explains
what the app *is* — this file is about how to change it without breaking it.

---

## The one-paragraph version

A static React + Vite app for tracking house chores. Everything lives in the
browser's `localStorage` and the app works fully offline; devices that opt in
also sync through Supabase. There are still **no accounts** — a household is an
unguessable id plus a key, shared by link. NFC stickers around the house hold
URLs like `https://homemaintenance.app/#kitchen`; tapping one opens that room's
task list, you tap **Log**, done. Deployed on Vercel from `main`.

---

## Design rules — please don't quietly break these

These are product decisions, not oversights. If a change would violate one, say
so and ask rather than "improving" it:

1. **No notifications. None.** No push, no browser notifications, no alarms in
   the calendar export (the `.ics` has no `VALARM` on purpose). The app never
   initiates contact. The user logs things when they do them.
2. **Never guilt-trip.** A task that isn't due today reads "resting," not
   "late." An area with nothing due shows **100%**, not 0%. There is no "you
   missed 4 tasks" anywhere and there shouldn't be.
3. **Streaks are generous.** The streak anchors to today *or yesterday*, so
   logging at 12:30am doesn't break it. Nothing can make a streak count down.
4. **One tap to log.** Tapping a tag and tapping Log is the whole ritual. Any
   feature that adds a step to that path needs a very good reason.
5. **Points are encouragement, never a target.** Hitting the weekly goal is not
   the point; the copy says so, and it should keep saying so.
6. **The user's data is theirs.** It stays in their browser unless they turn on
   sharing, and even then it goes only to their own Supabase project. Don't add
   analytics, telemetry, or third-party scripts.
7. **Local-first, always.** Tapping Log writes to this device and returns
   immediately; syncing happens afterwards. Nothing in the logging path may
   wait on the network — see the offline rule below.

---

## Ids are permanent — the most important rule in the codebase

Every area and task has an `id`. **Ids are load-bearing in two ways:**

- The NFC tags physically stuck to walls point at area ids (`#bathroom-1`).
  Changing one silently breaks a sticker that someone has to peel off and rewrite.
- Completion history is filed under task ids. Changing one orphans that history
  and resets the streak.

So: **display names are overrides, ids never move.** Renaming happens in
`src/lib/names.js` as a separate layer keyed by id. When you add anything
user-editable, follow that pattern rather than mutating the underlying id.

When a room or task is removed, its history is deliberately *kept* — see
`src/lib/custom.js`, which hides built-in rooms rather than deleting them.

---

## Layout

```
src/
├── config/
│   ├── areas.js     The default home: 7 rooms, 18 tasks. Edit this to change
│   │                what a NEW browser sees. Users override it at runtime.
│   ├── themes.js    Theme definitions + every user-facing string per theme
│   └── icons.js     Icons offerable in the room picker
├── lib/             Pure functions, no React. Test these in tests/logic.mjs.
│   ├── date.js      Week math (Monday-first), DST-safe day differences
│   ├── schedule.js  THE CORE: turns a schedule + history into a status
│   ├── stats.js     Streaks, points, progress, heatmap data
│   ├── storage.js   localStorage read/write + entry normalisation
│   ├── names.js     Display-name overrides
│   ├── custom.js    User-added rooms/tasks, hidden built-ins
│   ├── people.js    Household, who's logging
│   ├── backup.js    Export/import JSON
│   └── calendar.js  .ics builder
├── state/           React context providers (Names, Areas, People)
├── theme/           ThemeProvider
├── components/      All UI
└── index.css        Every color in the app, as CSS variables per theme
```

**Where things live, in one line each:**

- Changing what a chore *is* → `src/config/areas.js`
- Changing when it's due → `src/lib/schedule.js`
- Changing how it looks → `src/index.css` (tokens) or the component
- Changing wording → `src/config/themes.js` (`copy` object, per theme)

---

## Conventions that matter

**Colors are never hardcoded in components.** Everything reads a CSS variable
(`var(--ink)`, `var(--surface)`, `var(--area)`). This is what makes themes work.
If you write `text-slate-900` or `bg-white` in a component, the Starship theme
breaks. Area colors come from `areaStyle()`, which sets `--surface`/`--line`
inline so `.panel` tints itself.

**Adding a theme = 3 edits** (color block in `index.css`, entry in `themes.js`,
palette variant in `areas.js`). No component changes. Keep it that way.

**User-facing strings live in the theme's `copy` object**, so a theme can rename
"areas" to "decks". Don't hardcode a label a theme might want to change.

**Storage is versioned and forgiving.** Completions are `{at, by}` entries but
plain timestamps (the v1 shape) are upgraded on read. Every loader validates and
falls back to empty rather than throwing — a corrupt key should never white-screen
the app. Keep that property.

**Mobile first, genuinely.** Target is an iPhone held one-handed in a laundry
room. Tap targets ≥ 44px, inputs at 16px font (smaller makes iOS zoom the page),
and no horizontal overflow — the tests assert that last one.

---

## Testing

```bash
npm run check              # everything: 281 checks
npm run check -- logic     # just the fast pure-logic suite (no browser)
```

`tests/logic.mjs` needs nothing but Node. The browser suites drive real Chromium
through `playwright-core` — no browser is downloaded at install time; the harness
finds Chrome on your machine, or you point `CHROME_PATH` at one.

**Run `npm run check` before pushing.** There is no CI on this repo, so it's the
only safety net. If you change scheduling logic, the logic suite is the one that
catches you: it asserts things like "only one bathroom is deep-clean-active in a
given week" and "a Monday scoop doesn't count for Wednesday."

Testing against the deployed site:
```bash
TEST_URL=https://homemaintenance.app npm run check
```

---

## Deployment

- **Vercel, auto-deploys from `main`.** Framework preset Vite, output `dist/`.
  No environment variables today — if something asks for one, be suspicious.
- **The build emits a service worker** (`dist/sw.js`) that precaches the app.
  A new deploy is picked up on the next load: `index.html` is fetched
  network-first, hashed assets are cache-first, old caches are cleaned up.
- **Domain:** `homemaintenance.app` (registered at Porkbun, DNS pointed at
  Vercel). `.app` is HSTS-preloaded, so **every NFC tag URL must be `https://`**.
- **Don't write NFC tags against a `*.vercel.app` URL.** Those generated URLs sit
  behind Vercel's deployment protection and can hit a login wall from a phone.
  The in-app tag setup screen warns about this.

---

## Workflow

- **Develop on a branch, open a pull request** — don't push to `main`.
- **Keep adding to the open PR** until it's merged; don't open a second one
  alongside it.
- **After a merge, start fresh.** Restart the branch from the new `main`
  (`git fetch origin main && git checkout -B <branch> origin/main`) rather than
  stacking onto merged history.
- Commit messages: explain *why*, not just what. Note anything that was verified
  and anything that wasn't.

---

## Things that will bite you

- **`.ics` line folding is measured in bytes, not characters.** An em dash in a
  task note can push a line past the 75-octet limit and break the import. This
  was a real bug; `foldLine()` in `calendar.js` handles it.
- **Re-exporting the calendar relies on stable UIDs + an incrementing
  `SEQUENCE`** stored in localStorage. Don't reset that state or every re-export
  duplicates events in the user's calendar.
- **Tailwind only keeps classes it can literally see.** `` `bg-${color}-500` ``
  compiles to nothing. That's why area colors are CSS variables, not class names.
- **Nested interactive elements.** A `<button>` containing an `<input>` means the
  obvious tap does the wrong thing (and it's invalid HTML). This shipped once in
  the household screen and had to be rewritten.
- **localStorage is per-device.** There is no sync. Backups are the only recovery
  path, which is why the backup feature exists — don't quietly remove it.
- **The app must work with no signal.** Tags get tapped at the coop and in the
  basement. A service worker (via `vite-plugin-pwa`) precaches the whole shell,
  and `tests/offline.mjs` asserts a tag tap still opens its room with the
  network off. Anything that makes first paint depend on the network — a font
  from a CDN, a blocking API call — breaks the tap that matters most.

---

## Sharing between devices

Optional, off until someone turns it on. `supabase/schema.sql` is the whole
backend: three tables with RLS on and **no policies at all**, plus two
`security definer` functions that check a household key. The published anon key
therefore grants nothing by itself.

- **Completions are events**, keyed by `(household, task, instant)`. Merging is
  a union, so two phones logging offline both arrive and pushing the same event
  twice changes nothing. This is why sync needed no conflict resolution.
- **Settings are last-write-wins** — one JSON document holding names, rooms and
  the roster. The timestamp attached to a push comes from
  `src/lib/settingsClock.js`, which the providers stamp on real user actions.
  **Do not try to infer "the user edited something" by diffing state**: a
  document that has round-tripped through Postgres comes back with different
  key order, the diff sees a change that never happened, and a device that only
  *read* the settings overwrites the other phone's edits. That bug was built,
  found by the two-phone test, and replaced with the explicit clock.
- The client talks to PostgREST over plain `fetch` — no Supabase SDK — so
  `tests/fake-supabase.mjs` can stand in for the real thing and the request
  shapes get exercised for real.
