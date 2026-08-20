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
   The credits scene has exactly **two** states — lively and quiet — and quiet
   means dimmer light and a sleeping cat, nothing more. Decay, damage, dying
   plants and "out of commission" were considered and deliberately rejected:
   one log flips the scene straight back, and nothing you own is ever taken
   away or degraded.
   **Overdue is amber, never red.** `--alert-*` is for things that take
   something away from you — stopping sharing, removing a room. A chore that
   has been sitting a while gets `--attention-*`. The app has no failure state,
   so nothing in it should be the colour of a fire alarm.
   **Start fresh** exists for when the list has built up anyway: it draws a line
   and stops old chores being called late. It logs nothing, deletes nothing, and
   moves neither the streak nor the credit balance — see below.
3. **Streaks are generous.** The streak anchors to today *or yesterday*, so
   logging at 12:30am doesn't break it. Nothing can make a streak count down.
   Days the household is **away** are stepped over: they don't add to the streak
   — you didn't do a chore — but they can't break it either. A week away must
   never cost somebody three months.
4. **One tap to log.** Tapping a tag and tapping Log is the whole ritual. Any
   feature that adds a step to that path needs a very good reason.
5. **Points are encouragement, never a target.** Hitting the weekly goal is not
   the point; the copy says so, and it should keep saying so. Credits are the
   same rule with a shop attached: they buy **decoration only**. Nothing the app
   already does may end up behind a purchase, and no purchase may ever change
   what's due, what's worth what, or what the history says.
6. **The user's data is theirs.** It stays in their browser unless they turn on
   sharing, and even then it goes only to their own Supabase project. Don't add
   analytics, telemetry, or third-party scripts.
   The **one** exception is the town typed into the Today screen, which is sent
   to Open-Meteo for a forecast — opt-in, never until the user fills it in, and
   said out loud in the form itself. Nothing from open-meteo.com *runs* in the
   page: it is a plain `fetch`, not a script tag, so the rule above still holds
   as written. Anything new that would send something off the device gets the
   same treatment or doesn't ship.
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

**Editing a task follows the same rule.** Points, schedule and whether it can be
logged more than once live in `custom.taskSettings`, keyed by task id and merged
on top in `composeAreas()` (`src/lib/compose.js`). A built-in task and one you
invented are edited through the same map, so they behave identically — and
nothing about editing can move an id.

---

## Layout

```
src/
├── config/
│   ├── areas.js     The default home: 7 rooms, 18 tasks. Edit this to change
│   │                what a NEW browser sees. Users override it at runtime.
│   ├── themes.js    Theme definitions + every user-facing string per theme
│   ├── catalog.js   The shop: every item credits can buy, named per theme
│   ├── forecast.js  The two Open-Meteo endpoints (no key, no env var)
│   └── icons.js     Icons offerable in the room picker
├── lib/             Pure functions, no React. Test these in tests/logic.mjs.
│   ├── date.js      Week math (Monday-first), DST-safe day differences
│   ├── schedule.js  THE CORE: turns a schedule + history into a status
│   ├── stats.js     Streaks, points, progress, heatmap data
│   ├── storage.js   localStorage read/write + entry normalisation
│   ├── names.js     Display-name overrides
│   ├── custom.js    User-added rooms/tasks, hidden built-ins, task overrides
│   ├── compose.js   Built-ins + your rooms + your overrides, merged into one list
│   ├── people.js    Household, who's logging
│   ├── turns.js     Whose job a chore is, and whose turn it is next
│   ├── away.js      Trips: the days nothing is due and the streak carries over
│   ├── reset.js     Starting over: what it clears and what it keeps
│   ├── credits.js   Credits earned/spent, and how lively the scene is
│   ├── estate.js    What each person has bought, keyed by person id
│   ├── places.js    Your town and your work address
│   ├── forecast.js  Today's weather, cached so it works with no signal
│   ├── maps.js      The directions deep link — no API, no key
│   ├── daily.js     Today's free-text list. Earns nothing, syncs nowhere.
│   ├── backup.js    Export/import JSON
│   └── calendar.js  .ics builder
├── state/           React context providers (Names, Areas, People, Estate, Away)
├── theme/           ThemeProvider
├── components/      All UI
│   └── scenes/      The credits scene, one per look, sharing parts.jsx
└── index.css        Every color in the app, as CSS variables per theme
```

**Where things live, in one line each:**

- Changing what a chore *is* → `src/config/areas.js`
- Changing when it's due → `src/lib/schedule.js`
- Changing how it looks → `src/index.css` (tokens) or the component
- Changing wording → `src/config/themes.js` (`copy` object, per theme)
- Changing what credits buy → `src/config/catalog.js`
- Changing what "away" suppresses → `applyGrace()` in `src/lib/schedule.js`
- Changing whose job a chore is → it's an override too; see `turns.js`
- Changing what a task is worth → it's an override; see `taskSettings` below
- Changing the weather source → `src/config/forecast.js`, and read the rule below first

---

## Conventions that matter

**Colors are never hardcoded in components.** Everything reads a CSS variable
(`var(--ink)`, `var(--surface)`, `var(--area)`). This is what makes themes work.
If you write `text-slate-900` or `bg-white` in a component, the Starship theme
breaks. Area colors come from `areaStyle()`, which sets `--surface`/`--line`
inline so `.panel` tints itself.

**Adding a theme = 3 edits** (color block in `index.css`, entry in `themes.js`,
palette variant in `areas.js`). No component changes. Keep it that way. A theme
also names its credits scene through `progression.sceneKind`; reusing an existing
one costs nothing, and a new one is a component in `src/components/scenes/` plus
a `labels` entry per item in `catalog.js`.

**Scenes are inline SVG, never image files.** Two reasons, and the second is the
load-bearing one:

1. The service worker precaches the shell, and anything that waits on a download
   breaks the tap that matters most. `SpaceBackdrop.jsx` is the precedent.
2. **The art is parameterized.** The finish slot recolours the vessel at
   runtime, mood dims the whole scene, and companions rescale the same shape.
   Pre-rendered images would have to bake every combination — 4 vessels × 5
   finishes × 2 moods × 3 themes is 120 files for the main character alone. The
   three scene files are ~40KB of code and cover all of it. Whenever "should
   this be an image?" comes up again, that's the answer.

**Draw with `scenes/parts.jsx`, not from scratch.** `Solid`, `Blob` and `Ground`
give a shape its outline, its top light and its contact shadow. Three rules
learned the hard way:

- **Outline with `shade(fill)`, never black.** A black outline turns everything
  into clip-art, and it can't follow a colour the user picked from the shop.
- **Everything resting on a surface casts a `Ground` shadow.** Nothing did in
  the first pass, and that alone made the whole scene look pasted on.
- **Never hardcode a colour in a vessel.** It has to come from the equipped
  finish or the shop's recolouring silently stops working.

**Detail scales with price.** The 50-credit succulent is a plain rosette; the
320-credit orchid has five blooms, a bud, aerial roots and strap leaves. If the
top of a slot doesn't look more expensive than the bottom, the slot is broken.

Flat colour at low opacity over a dark background goes muddy — use a gradient
that actually fades to zero for any glow.

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
npm run check              # everything: 796 checks
npm run check -- logic     # just the fast pure-logic suite (no browser)
```

`tests/logic.mjs` needs nothing but Node. The browser suites drive real Chromium
through `playwright-core` — no browser is downloaded at install time; the harness
finds Chrome on your machine, or you point `CHROME_PATH` at one.

**Run `npm run check` before pushing.** `.github/workflows/check.yml` runs the
same command on every push and pull request, but finding out locally is faster
than finding out from a red tick. If you change scheduling logic, the logic suite is the one that
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

## Whose job is it

A chore belongs to one person, rotates round the household, or belongs to
nobody — which is what every chore was before this existed and what most of them
should stay.

- **It's an override, not a store.** `assignee` is in `SETTABLE` in
  `src/lib/custom.js`, so it lives in `taskSettings` keyed by task id alongside
  points and schedule. Ids never move, and it syncs and backs up for free.
- **A rotation is derived, never stored.** `whoseTurn()` in `src/lib/turns.js`
  reads the `by` on the newest completion — the same field `creditsEarned()`
  reads. A stored pointer would be a second opinion, and it would drift the
  first time somebody logged from the other phone while offline.
- **It is a hint and never a lock.** Anyone can log anything in one tap whoever
  it belongs to, and `tests/assign.mjs` asserts exactly that. The moment
  assignment can stop a tap, design rule 4 is gone.
- **It never becomes a scolding.** The card says whose turn it is; nothing
  anywhere says somebody missed theirs. No new colour — certainly not
  `--alert-*`.
- **Somebody who has left isn't whose turn it is.** A task assigned to a removed
  person reads as unassigned rather than as a name nobody recognises, and a
  rotation whose last logger has gone starts again at the top.
- **"Mine" keeps what nobody has claimed.** An unassigned chore is everybody's
  to worry about, not nobody's, so it stays in the filtered list.

---

## Today

One screen, three blocks, and each one exists in the shape it does because of a
constraint rather than a preference.

- **The weather is Open-Meteo, over plain `fetch`.** Free, no API key, no
  signup, CORS-friendly, and it does the place lookup too — so one service and
  **no environment variable**, which is what DEPLOYMENT.md asks for. Its
  geocoder resolves towns and postcodes, not street addresses; the form says so
  rather than pretending otherwise.
- **The reading is cached and the fetch is allowed to fail.** `loadReading()`
  paints first, the refresh happens behind it, and with no signal you get this
  morning's numbers plus the time they were taken. When `navigator.onLine` is
  already false it doesn't even ask. Nothing on this screen may gate on the
  network — same rule as design rule 7, one screen over.
- **Travel time is a deep link, not an API.** Every routing service that knows
  about live traffic wants an account and a token. `src/lib/maps.js` builds a
  directions URL instead, and **deliberately omits the origin** so the maps app
  uses current location — more accurate than any address we could store, one
  less thing kept, and right whether you're leaving home or leaving work. The
  address is `encodeURIComponent`'d: an `&` or a `#` in a street address would
  otherwise cut the URL in half.
- **The free-text list earns nothing and is never late.** It never touches
  `log.completions`, so it cannot move points, the streak, or the credit
  balance — credits are derived from `task.points` over completions, and a note
  with no task has no business in that sum. It has no schedule, so nothing on
  screen shows its age.
- **The list is the one store that doesn't sync**, on purpose. Settings are
  last-write-wins, and the note on purchases below already concedes that two
  devices writing within seconds can cost one of them a write. Losing a purchase
  is a refunded credit; losing today's list is the whole feature. It rides in
  backups and stays put otherwise. If it ever has to be shared, model it the way
  completions are modelled.
- **The town and the work address are settings**, so they ride in the sync
  document, go in the backup, and are stamped with `touching()` like every other
  provider.
- **Six chores, then "show the other N".** Opening a fresh phone to thirteen
  cards is the wall this app exists to avoid. Nothing is hidden — it just isn't
  the first thing you see.

`tests/fake-forecast.mjs` stands in for Open-Meteo the way
`tests/fake-supabase.mjs` stands in for Supabase, so `npm run check` exercises
the real request shapes and never leaves the machine.

---

## Credits and the scene

Weekly points measure this week and reset on Monday. **Credits are the same
numbers with a different lifetime** — they accumulate forever and buy decoration
on the estate screen.

- **Credits are derived, never stored.** `creditsEarned()` sums `task.points`
  over the completions a person logged; `spent` is the only thing on disk. That
  means credits inherit sync and backup for free — completions already merge
  across phones and already travel in backup files, so there is no second ledger
  to keep in step. Don't add one.
- **They belong to a person, not a device.** Completions already carry `by`, so
  Eddie and Yasmine each build their own scene and it follows them to any phone.
  Entries logged before the household feature existed have no `by` and are
  credited to the **first person on the roster**, which makes a long solo history
  count as that person's rather than nobody's.
- **One catalogue, three shelves, one wallet.** The catalogue is shared and
  `labels` in `src/config/catalog.js` must still cover **all three** themes — the
  logic suite fails a half-added item, and the slot needs art in all three scene
  components. But **what you own is per look**: `estate[person].looks[themeId]`
  holds `owned`, `equipped` and `companions`. Buying the freighter used to hand
  you the Maine Coon, which made a price mean nothing.
  What stays at the person level is `spent` — one pot of credits, earned once
  from your chores, so dressing the ship is money not spent on the cats — and
  `boostUntil`, because a treat is a mood and should light whichever scene you
  open.
  **The old flat shape is migrated, not wiped.** `normalizeEstate()` grants a
  pre-existing `owned` list in all three looks: design rule 2 says nothing you
  own is ever taken away. Only what's bought from here on is per look.
- **Weather has to change the light**, not sit on top of it. Rain falling past a
  bright sun reads as a sun-shower, which is not what anybody bought — so the
  weather item drives the sky colour and the sunbeam as well as drawing itself.
- **Scatter by hashing the index, not by stepping a modulo.** `(i * 41) % 244`
  lands points in neat diagonal strings; the snow came out looking like beads on
  a wire. `scatter()` in each scene hashes instead, and is still deterministic.
- **Item ids are permanent**, for the same reason area and task ids are:
  ownership is recorded by id, so renaming one un-buys it for everybody.
- **Liveliness is computed, never stored.** `sceneMood()` reads `STATUS.OVERDUE`
  from the existing schedule logic. Don't invent a second definition of "behind"
  — the scene and the task list must not be able to disagree.
- **Removing a person leaves their estate in the map**, unreachable but intact,
  matching how a removed room keeps its history.

---

## Starting over

`src/lib/reset.js`. Everything else in this app is additive on purpose — hiding
a room keeps its history, ending a trip early trims it, a fresh start logs
nothing and deletes nothing. **This is the only thing that takes something
away**, so:

- **It clears what you did, keeps what you set up.** Completions and the estate
  go; `custom` is not even read by `hardReset()`, which is the cheapest possible
  guarantee that an added room or an edited task survives. Trips stay — they're
  a record of where the household was, not of what it achieved — and the
  fresh-start line goes, having nothing left to cover.
- **It is the one screen allowed to use `--alert-*`.** CLAUDE.md reserves those
  colours for things that take something away from you and everywhere else that
  would be a lie. Here it isn't.
- **Two taps, with the real numbers in between.** `resetSummary()` counts the
  entries and purchases so the confirmation states the cost rather than being
  vague about it, and a backup is offered right there.
- **It has to reach the server** — see the `reset_at` note under sharing below.
  Re-running `supabase/schema.sql` is a manual step; without it the reset works
  locally and the sheet says why the shared copy came back.

---

## Going away, and starting fresh

`src/lib/away.js` holds the dates that soften the schedule, and `applyGrace()`
at the end of `getTaskState()` is the only thing that reads them. There are two,
and they must stay in one place: a second module would be a second opinion about
what "behind" means.

**Start fresh** (`freshStartAt`) draws a line under a backlog. Anything not
logged since reads as *due* rather than *overdue*, and once it is logged its own
clock takes over again with no flag to clear. It is deliberately derived from
`lastDone` rather than rewriting any schedule maths, and it **logs nothing and
deletes nothing** — the streak, the history and the credit balance must come out
the other side identical. `tests/fresh-start.mjs` asserts exactly that, byte for
byte.

**Away** is a window of days when the house is empty. `src/lib/away.js` holds a **list** of
them — not one slot, because the streak has to span trips taken months ago and a
single slot forgets the older one.

- **It is household-wide, not per person.** Away means nobody is home and the
  house isn't making mess. If one person travels and the other stays, the chores
  still need doing and this should be off. The streak is already household-wide,
  so this is consistent.
- **One place decides.** `applyAway()` runs at the end of `getTaskState()`, so
  all nine schedule kinds are covered by one rule and everything downstream —
  the queue, progress bars, the credits scene — inherits the same answer. Do not
  add a second "are we away" check anywhere, for the same reason there is only
  one definition of overdue.
- **Done stays done** while away: you might well log something from the road.
- **Coming home is a list, not a reckoning.** For `GRACE_DAYS` after a trip,
  overdue reads as due. After that the app is honest again — the litter really
  does need doing.
- **Ending a trip early trims it, it doesn't delete it.** You really were away
  for the days you were away, and the streak still needs to know that.

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
- **`reset_at` is the one exception to the union**, and it exists because the
  union is otherwise total. Wiping a phone locally achieves nothing while the
  household still holds the history — the next sync hands it straight back — and
  clearing the server isn't enough either, because the *other* phone still has
  its copy and pushes it back. So `hm_reset` stamps the instant on the
  household: `hm_sync` refuses incoming events older than it, and hands it back
  so every device drops its own copy of what came before. Anything logged since
  survives, so a phone that was offline all week keeps that week's work. This
  was found by the two-phone test, which watched four rows reappear one
  `hm_sync` after they were deleted.
- **Settings are last-write-wins** — one JSON document holding names, rooms and
  the roster. The timestamp attached to a push comes from
  `src/lib/settingsClock.js`, which the providers stamp on real user actions.
  **Do not try to infer "the user edited something" by diffing state**: a
  document that has round-tripped through Postgres comes back with different
  key order, the diff sees a change that never happened, and a device that only
  *read* the settings overwrites the other phone's edits. That bug was built,
  found by the two-phone test, and replaced with the explicit clock.
- **Purchases ride in the settings document**, so they are last-write-wins too.
  Two phones buying in the same few seconds can cost one of them a purchase —
  worst case a refunded credit, never corruption. Making it merge properly would
  mean an event log per purchase, which is not worth it for a shop full of
  decoration. If it ever is, model it the way completions are modelled.
- The client talks to PostgREST over plain `fetch` — no Supabase SDK — so
  `tests/fake-supabase.mjs` can stand in for the real thing and the request
  shapes get exercised for real.
