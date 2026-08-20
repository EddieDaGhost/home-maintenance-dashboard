# 🏠 Home Maintenance Dashboard

A low-friction home maintenance and cleaning tracker. Tap an NFC tag on the
wall, the right list opens on your phone, you tap **Log**, and you're done.

**Built around a few rules:**

- **No notifications.** Nothing buzzes at you. You log things when you do them.
- **No guilt.** Tasks that aren't your problem today say "resting," not "late."
  A quiet day reads as 100%, not 0%.
- **Nothing to sign into.** No accounts, ever. Your data lives on your phone;
  sharing it with someone is a private link, not a login.
- **One tap to log.** Tap the tag, tap Log. That's the whole ritual.
- **Works with no signal.** The whole app is cached on your phone after the
  first visit, so a tag still opens instantly at the coop or in the basement.

---

## Three looks

Tap the button in the top right to switch. Your tasks, history, streak, and
points are identical in all three — it's paint, not plumbing.

| | |
|---|---|
| **Homestead** | Soft daylight. Calm and plain. Credits build a windowsill garden. |
| **Starship** | Your house, in orbit. Deep space behind the glass, a drifting starfield, a planet turning below, cyan console panels. Areas become *decks*, recent activity becomes the *ship's log*, and credits fit out a ship. |
| **Cats** | A warm afternoon and four opinions. Credits buy cats, and things for cats. |

The starfield is drawn with plain `<div>`s and CSS — nothing to download, and it
holds a steady 60fps on a phone. If your phone has **Reduce Motion** turned on,
all of it sits still automatically. The scenes are inline SVG for the same
reason: there is no image to wait for, so they work with the phone in aeroplane
mode like everything else.

See [Adding your own theme](#adding-your-own-theme) below.

---

## The areas

| Area | Tag URL | Tasks |
|---|---|---|
| Litter Boxes | `#litter` | Scoop (Mon/Wed/Fri), full change (every 2 weeks) |
| Bathroom 1 | `#bathroom-1` | Deep clean (week 1 of 3), mirror (2x/wk), supplies (weekly) |
| Bathroom 2 | `#bathroom-2` | Deep clean (week 2 of 3), mirror (2x/wk), trash (2x/wk) |
| Bathroom 3 | `#bathroom-3` | Deep clean (week 3 of 3), mirror (2x/wk), supplies (weekly) |
| Kitchen | `#kitchen` | Dishes (daily), fridge check (Fridays) |
| Laundry | `#laundry` | Wash & dry, fold & put away (weekends) |
| Chickens | `#chickens` | Food & water (weekly), check-in (every 3–4 days), deep clean (quarterly) |

The three bathrooms deep-clean on a rotation, so only **one** bathroom is ever
asking for a deep clean in a given week. The other two sit quiet.

---

## Running it on your computer

You need [Node.js](https://nodejs.org) installed. Then:

```bash
npm install     # once, to download the dependencies
npm run dev     # start it up — open the http://localhost:5173 link it prints
```

Other commands:

```bash
npm run build     # build the production version into dist/
npm run preview   # preview that production build locally
npm run check     # run the tests (659 checks)
```

`npm run check` drives a real browser through the app — logging, persistence,
NFC routing, themes, renaming, backups, the lot. It needs Google Chrome
installed; no browser is downloaded during `npm install`. If it can't find one:

```bash
CHROME_PATH="/path/to/chrome" npm run check
```

Run it before pushing. GitHub Actions runs the same command on every push and
pull request, but a red tick five minutes later is a slower way to learn.
See [CLAUDE.md](CLAUDE.md) for how the code is organised.

---

## Rooms and tasks — no code needed

Open any room and tap the **✏️ pencil** in its header, or use **Add a room** at
the bottom of the room list. From there you can:

- **Rename** the room, its subtitle, and every task in it
- **Change its icon and color** from a picker
- **Add a task**, with any of the schedules below and its own point value
- **Edit any task** — tap the ⌄ next to it to change what it's worth, how often
  it's due, and whether it can be logged more than once. Built-in chores and
  ones you invented are edited the same way, and *Back to the original* undoes
  it. Your history is filed under the task, not its settings, so none of this
  costs you a streak.
- **Remove a task**, or **remove the room itself**
- **Reset this room** to undo all your renaming

**Nothing is ever really deleted.** A room you created is removed outright; a
built-in room is only *put away* and reappears under "Put away" at the bottom of
the room list, with its history intact. Task history is kept either way, so
bringing something back brings its streak back too.

**Your NFC tags keep working.** A tag points at the room's *id* (`#bathroom-1`),
never its name — so "Bathroom 1" can become "Kids' Bathroom" without touching a
sticker, and your streak and history stay intact. A room you add gets its own id
and its own address (`#garage`) the moment you create it; check **NFC tag setup**
for the exact URL.

All of this lives in your browser alongside your history. To change the rooms for
everyone, on every device, edit `src/config/areas.js` instead — that file is
still the starting point every browser sees.

---

## Changing your tasks

**Everything you'd want to edit is in one file: [`src/config/areas.js`](src/config/areas.js).**

Add a room, rename a chore, change how often something happens — it's all there,
with comments. You don't need to touch anything else. Save the file and the page
updates instantly while `npm run dev` is running.

### The schedule types

| Write this | It means |
|---|---|
| `{ kind: 'daily' }` | Every day |
| `{ kind: 'weekdays', days: [1, 3, 5] }` | Mon, Wed, Fri (`0` = Sunday) |
| `{ kind: 'timesPerWeek', times: 2 }` | Any 2 days a week, your pick |
| `{ kind: 'weekly' }` | Once a week, any day |
| `{ kind: 'weeklyOn', day: 5 }` | Every Friday |
| `{ kind: 'weekend' }` | Saturday or Sunday |
| `{ kind: 'rotatingWeek', cycle: 3, offset: 0 }` | Your turn 1 week in every 3 |
| `{ kind: 'everyNDays', days: 14 }` | 14 days after you last did it |
| `{ kind: 'everyNMonths', months: 3 }` | Quarterly |

**A note on the difference:** `weekly` resets every Monday whether or not you did
it. `everyNDays` counts from the last time you actually logged it — better for
things like litter changes, where what matters is how long it's been.

### Adding a new area in code

You can add rooms from inside the app (above) — this is for changing the
defaults that every browser starts from. Add a block to the `AREAS` list in
`src/config/areas.js`:

```js
{
  id: 'garage',                 // this is also the NFC URL: yoursite.com/#garage
  name: 'Garage',
  subtitle: 'Tools & bins',
  icon: Car,                    // import it at the top from 'lucide-react'
  color: 'violet',              // any palette from PALETTES
  tasks: [
    { id: 'garage-sweep', name: 'Sweep floor', schedule: { kind: 'weekly' }, points: 5 },
  ],
}
```

Give every area and task an `id` that you never change afterward — the ids are
how your completion history is stored. Renaming an id starts that task's history
over from scratch.

---

## Adding your own theme

No component hardcodes a color. Every one reads CSS variables, so a theme is
three small edits:

**1. The colors** — add a block to `src/index.css`:

```css
[data-theme='cabin'] {
  --canvas: #1c1917;      /* page background */
  --surface: #292524;     /* card background */
  --line: #44403c;        /* card border */
  --ink: #fafaf9;         /* main text */
  --accent: #f97316;      /* buttons */
  /* ...copy the rest of the keys from an existing block */
}
```

**2. The words** — add an entry to `src/config/themes.js` with the same id. The
`copy` object renames anything on screen, so a theme can call areas "cabins" or
points "chores" if that's what makes you want to open it.

**3. The area colors** — add a variant to `makePalette` in
`src/config/areas.js` so the seven areas know how to look in your new theme.

That's it — your theme shows up in the picker automatically. Set `flavor: 'space'`
to reuse the starfield backdrop, or leave it `'plain'`, and point
`progression.sceneKind` at whichever credits scene suits it. A brand new scene
means a fourth component in `src/components/scenes/` and a `labels` entry for
your theme on every item in `src/config/catalog.js` — the test suite fails an
item that's missing one.

---

## How the statuses work

| Status | Meaning |
|---|---|
| 🔵 **Due** | It's time. Go do it. |
| 🔴 **Overdue** | Well past due, or it's the last day of the window. |
| 🌙 **Resting** | Not your turn today. Shows when it comes back around. |
| 🕐 **Upcoming** | Scheduled, not yet. |
| ✅ **Done** | Finished for now. Tap **Undo** if you tapped Log by accident. |

**Streak** = days in a row you logged *something*. It counts today or yesterday
as the anchor, so an evening person doesn't lose it at midnight.

**Points** are a weekly score that resets Monday. Bigger jobs are worth more.
The weekly goal is just the total of everything scheduled that week — hitting
100% is not the point, and nothing bad happens if you don't.

---

## NFC tags

**The app tells you what to write.** Tap **NFC tag setup** at the bottom of the
dashboard: it lists the master tag plus every area, with a Copy button for each
one. The addresses are built from whatever URL you're currently using, so they
can't drift out of date — add an area to the config and its tag appears in the
list automatically. Open the app on your real domain before copying, and the
addresses are the ones you actually want on your tags.

See **[NFC_TAGS.md](NFC_TAGS.md)** for what to buy, where to stick them, and the
gotchas (metal surfaces, weatherproofing, locking a tag).

---

## Calendar export

**Export to iPhone Calendar** at the bottom of the dashboard downloads a
`home-maintenance.ics` file. Open it on your iPhone and Calendar offers to add
everything as repeating all-day events.

Deliberately, these events have **no alerts attached**. They're there to glance
at, not to nag. Logging still happens in the app.

**Re-exporting is safe.** Every event keeps the same UID for the life of the
task and each export bumps its `SEQUENCE`, which is the iCalendar way of saying
"this is a newer version of an event you already have" — so a calendar updates
what it has rather than stacking a second copy. Tasks you've deleted since the
last export are re-sent as cancellations so they clear out too. (How thoroughly
that happens is up to the calendar app; Apple Calendar and Google Calendar both
honour UID + SEQUENCE.) So: change your schedule, re-export, open the file.

---

## History

**History** in the setup list shows your current and best streak, a heatmap of
the last 12 weeks, and every entry grouped by day. Tap any square to see that
day's count.

The heatmap uses one color in four steps — darker means a busier day in
Homestead, brighter means a busier day in Starship — with a neutral square for
"nothing logged". Both ramps were checked for monotone lightness, visible gaps
between steps, and contrast against their own background.

---

## Chores you do more than once

Some things get done three times a day. Open the room, tap ⌄ next to the task
and turn on **Can be logged more than once**. The Log button stops disappearing
after the first tap, the card shows a ×2, ×3, and every tap is worth its full
points and credits again.

---

## When the list has got away from you

**Setup → Start fresh.** Draws a line under the backlog: everything stays on the
list, it just stops being described as late.

It is the honest version of a reset. It marks nothing as done, so it can't hand
you points or credits you didn't earn; it deletes nothing, so your history,
streak and balance come out exactly as they went in; and the moment you log one
of those chores, that one goes straight back to its normal schedule. You can
undo it whenever you want the full picture back.

Overdue chores are amber rather than red, for the same reason. Red is reserved
for things that actually take something away from you.

---

## Today

One screen for the morning, reached from **Today** on the dashboard. Three
things, in this order:

**The weather** for wherever you are. Type a town or a ZIP into
**Weather and the drive** and it's saved for good; the forecast comes from
[Open-Meteo](https://open-meteo.com), which needs no account and no API key.
The last reading is kept on your phone, so with no signal you get this
morning's numbers and the time they were taken rather than an error — and if
you never fill this in, nothing is ever looked up.

It resolves **towns and postcodes, not street addresses**, which is all a
forecast needs.

**The drive to work.** Put your work address in the same form and you get a
**Drive to work** button that opens Apple or Google Maps with directions
already set, live traffic and all. There's no routing API behind it and no key
to get: your address only ever goes into the maps app, and the route starts
from wherever you actually are rather than from a stored home address.

**What's on the plate** — the chores that are due, exactly as the front page
ranks them, plus anything you type in yourself ("call the vet", "pick up
feed"). Those typed items are just a list: they earn no points, they never
touch your streak, nothing about them is ever called late, and they stay on the
device you wrote them on. Tick one off and it drops to the bottom; it clears
itself the next day.

---

## Going away

**Setup → Away.** Pick two dates, or tap *This weekend* / *A week*. While you're
gone:

- Nothing reads as due. Every room says all clear.
- Your streak carries straight over the gap instead of resetting.
- The credits scene stays lively.

The day you get home, everything comes back — worded gently for the first day,
so you get a to-do list rather than a wall of red. After that it's honest again.

It applies to the **whole household**, because it means the house is empty. If
someone stays home, leave it off and let them log as usual. Past trips are kept
so your streak still reads correctly months later, and ending one early trims it
rather than pretending you never went.

---

## Credits and your windowsill

Everything you log is worth points. Points measure the week and reset on Monday;
**credits** are the same numbers kept forever, and they buy things.

The balance sits on the dashboard, under your streak. Tapping it opens a scene
that is yours to build: a plant, a pot glaze, a view, the weather outside, and a
few small joys — plus more plants (name them if you like), and plant food that
perks everything up for a day. In Starship the same purchases are a hull, a
livery, a dock, whatever you're flying through, and a decal; in Cats they're a
cat, a coat, a room, the weather, and a collar.

Eighteen things to buy, 50–320 credits each. A fully kept week is about 120, so
the cheap end is a couple of days and the whole catalogue is a few months.

**Try before you buy.** Tap any item's name and it appears in the scene above,
with a bar telling you what it costs and that nothing has been spent. That works
for things you can't afford yet, which is the point — it's how you decide what
you're saving for.

Three things it deliberately does *not* do:

- **Nothing is ever locked behind a purchase.** Every chore, every screen and
  every number works exactly the same whether you own nothing or everything. It
  is decoration, start to finish.
- **Nothing decays.** If something is overdue the light goes low and the cat goes
  to sleep — that's the whole range. Nothing dies, breaks or gets taken away, and
  one log brings the sun back.
- **Credits are per person, not per phone.** Yours are built from what *you*
  logged, so you and your fiancée each build your own scene and it follows you to
  whichever phone you pick up.

---

## Who's logging

With one person, nothing changes. Add someone under **Who's logging** and:

- A initials chip appears in the header showing who gets credit right now
- Each completion records who did it
- Recent activity and History show the name next to each entry
- The household screen shows each person's points for the week

It's about credit, not accounts — everyone shares the same device and the same
history. Removing someone leaves their past entries in place.

---

## Sharing with the rest of the household

**Setup → Share with another device.** One tap turns on a shared household and
gives you an invite link; anyone who opens it joins. From then on every phone
sees the same rooms, the same history and the same streak, and anyone can log.

- **Your existing history comes with you** — it uploads on the first sync.
- **Logging still works with no signal.** Every tap saves locally first; the
  phone catches up when it can. Two people logging offline both arrive, because
  completions merge rather than overwrite.
- **No accounts and no passwords.** A household is an unguessable id plus a key,
  and the invite link carries both — so treat it like a house key and send it to
  the people who live here, not a group chat.
- **Turning it off** on a device leaves that device's history intact.

The backend is your own Supabase project (free tier, and this uses kilobytes of
it). `supabase/schema.sql` sets it up in one paste — see the comments at the top
for how the security model works.

---

## Your data

Everything is stored in your browser's `localStorage` — your completions under
`home-maintenance-dashboard/v1`, your chosen theme under
`home-maintenance-dashboard/theme`. That means:

- ✅ No account, no server, no one else can see it.
- ✅ No analytics, no telemetry, no third-party scripts. The **only** thing that
  ever leaves your phone is the town you type into the Today screen, sent to
  Open-Meteo for the forecast — and only once you've filled it in.
- ⚠️ It's **per browser and per device.** Logging on your phone won't show up on
  your laptop, and clearing your browser data erases your history.

**So back it up.** The dashboard has **Back up my data**, which saves a small
`.json` file with your whole history and your custom names, and **Restore from a
backup**, which reads one back in. That file is the only thing standing between
you and starting over, and it's how you move to a new phone. Worth doing once a
month, or before you clear your browser.

That's the tradeoff for having zero setup and zero hosting cost. If you later
want history synced across devices automatically, that's the point where a real
backend (Supabase or Firebase) makes sense.

---

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the Vercel walkthrough and pointing a
custom domain at it.

---

## Project layout

```
src/
├── config/
│   ├── areas.js        ← YOUR HOME. Edit this to change rooms and chores.
│   ├── catalog.js      Everything credits can buy
│   └── themes.js       The looks you can switch between
├── theme/
│   └── ThemeProvider.jsx   Holds the current theme, remembers your choice
├── state/
│   ├── NamesProvider.jsx   Your custom room and task names
│   ├── AreasProvider.jsx   Built-in rooms + yours, merged into one list
│   ├── PeopleProvider.jsx  The household
│   └── EstateProvider.jsx  What each person has bought
├── lib/
│   ├── date.js         Date helpers (weeks, streak-safe day math)
│   ├── schedule.js     Decides if a task is due, resting, overdue, done
│   ├── stats.js        Streaks, points, progress bars
│   ├── storage.js      Reads and writes localStorage
│   ├── names.js        Custom names (ids never change)
│   ├── custom.js       Rooms and tasks you added, rooms you put away
│   ├── people.js       The household and who's logging
│   ├── credits.js      Credits earned and spent, and how lively the scene is
│   ├── estate.js       Purchases, kept per person
│   ├── backup.js       Backup and restore files
│   └── calendar.js     Builds the .ics calendar file
├── components/
│   ├── Dashboard.jsx      The master view: stats, what's due, area cards
│   ├── AreaView.jsx       A single area, opened by an NFC tag
│   ├── TaskCard.jsx       One task row with its Log button
│   ├── ThemePicker.jsx    The "choose a look" sheet
│   ├── EditAreaSheet.jsx  Rename / restyle / add tasks / remove a room
│   ├── ScheduleFields.jsx The "how often" picker
│   ├── HistorySheet.jsx   Streaks, heatmap, every entry
│   ├── HouseholdSheet.jsx Who's logging
│   ├── EstateScreen.jsx   Credits, the shop and your scene
│   ├── scenes/            The scene art, one component per look
│   ├── TagSetup.jsx       What to write on each NFC tag
│   ├── SpaceBackdrop.jsx  Starfield, nebulae and planet (CSS only)
│   ├── Sheet.jsx          The shared pop-up panel
│   └── ProgressBar.jsx
├── index.css           Theme color variables live here
└── App.jsx             Routing (via the URL hash) and app state
```

Built with React, Vite, Tailwind CSS, and [Lucide](https://lucide.dev) icons.
