# Working in this repo

Notes for Claude Code (and for anyone else picking this up). The README explains
what the app *is* — this file is about how to change it without breaking it.

---

## The one-paragraph version

A static React + Vite app for tracking house chores. No backend, no accounts:
everything lives in the browser's `localStorage`. NFC stickers around the house
hold URLs like `https://homemaintenance.app/#kitchen`; tapping one opens that
room's task list, you tap **Log**, done. Deployed on Vercel from `main`.

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
6. **The user's data is theirs.** It stays in their browser. Don't add
   analytics, telemetry, or third-party scripts.

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
npm run check              # everything: 209 checks
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
  No environment variables — if something asks for one, that's a red flag.
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

---

## Known gap

**No cross-device sync.** Logging on the phone doesn't reach the laptop. This is
the one remaining architectural limitation and it needs a real backend (Supabase
is the natural fit) — accounts, a schema, and a migration path for existing
localStorage data. It's a decision to make deliberately, not a chore to knock
out. Ask before starting it.
