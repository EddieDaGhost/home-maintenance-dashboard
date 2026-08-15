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

## Two looks

Tap the 🎨 button in the top right to switch. Your tasks, history, streak, and
points are identical in both — it's paint, not plumbing.

| | |
|---|---|
| **Homestead** | Soft daylight. Calm and plain. |
| **Starship** | Your house, in orbit. Deep space behind the glass, a drifting starfield, a planet turning below, cyan console panels. Areas become *decks*, points become *credits*, recent activity becomes the *ship's log*. |

The starfield is drawn with plain `<div>`s and CSS — nothing to download, and it
holds a steady 60fps on a phone. If your phone has **Reduce Motion** turned on,
all of it sits still automatically.

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
npm run check     # run the tests (281 checks)
```

`npm run check` drives a real browser through the app — logging, persistence,
NFC routing, themes, renaming, backups, the lot. It needs Google Chrome
installed; no browser is downloaded during `npm install`. If it can't find one:

```bash
CHROME_PATH="/path/to/chrome" npm run check
```

Run it before pushing — there's no CI on this repo, so it's the safety net.
See [CLAUDE.md](CLAUDE.md) for how the code is organised.

---

## Rooms and tasks — no code needed

Open any room and tap the **✏️ pencil** in its header, or use **Add a room** at
the bottom of the room list. From there you can:

- **Rename** the room, its subtitle, and every task in it
- **Change its icon and color** from a picker
- **Add a task**, with any of the schedules below and its own point value
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
to reuse the starfield backdrop, or leave it `'plain'`.

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
│   └── themes.js       The looks you can switch between
├── theme/
│   └── ThemeProvider.jsx   Holds the current theme, remembers your choice
├── state/
│   ├── NamesProvider.jsx   Your custom room and task names
│   ├── AreasProvider.jsx   Built-in rooms + yours, merged into one list
│   └── PeopleProvider.jsx  The household
├── lib/
│   ├── date.js         Date helpers (weeks, streak-safe day math)
│   ├── schedule.js     Decides if a task is due, resting, overdue, done
│   ├── stats.js        Streaks, points, progress bars
│   ├── storage.js      Reads and writes localStorage
│   ├── names.js        Custom names (ids never change)
│   ├── custom.js       Rooms and tasks you added, rooms you put away
│   ├── people.js       The household and who's logging
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
│   ├── TagSetup.jsx       What to write on each NFC tag
│   ├── SpaceBackdrop.jsx  Starfield, nebulae and planet (CSS only)
│   ├── Sheet.jsx          The shared pop-up panel
│   └── ProgressBar.jsx
├── index.css           Theme color variables live here
└── App.jsx             Routing (via the URL hash) and app state
```

Built with React, Vite, Tailwind CSS, and [Lucide](https://lucide.dev) icons.
