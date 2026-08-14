# 🏠 Home Maintenance Dashboard

An ADHD-friendly home maintenance and cleaning tracker. Tap an NFC tag on the
wall, the right list opens on your phone, you tap **Log**, and you're done.

**Built around a few rules:**

- **No notifications.** Nothing buzzes at you. You log things when you do them.
- **No guilt.** Tasks that aren't your problem today say "resting," not "late."
  A quiet day reads as 100%, not 0%.
- **Nothing to sign into.** Your data lives in your browser, not on a server.
- **One tap to log.** Tap the tag, tap Log. That's the whole ritual.

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
```

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

### Adding a new area

Add a block to the `AREAS` list in `src/config/areas.js`:

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

See **[NFC_TAGS.md](NFC_TAGS.md)** for what to buy, what to write on each tag,
and where to stick them.

The short version: each tag holds a URL. The master tag is your site address;
each area tag is your site address plus `#` and the area id.

---

## Calendar export

**Export to iPhone Calendar** at the bottom of the dashboard downloads a
`home-maintenance.ics` file. Open it on your iPhone and Calendar offers to add
everything as repeating all-day events.

Deliberately, these events have **no alerts attached**. They're there to glance
at, not to nag. Logging still happens in the app.

---

## Your data

Everything is stored in your browser's `localStorage` under the key
`home-maintenance-dashboard/v1`. That means:

- ✅ No account, no server, no one else can see it.
- ⚠️ It's **per browser and per device.** Logging on your phone won't show up on
  your laptop, and clearing your browser data erases your history.

That's the tradeoff for having zero setup and zero hosting cost. If you later
want history synced across devices, that's the point where a real backend
(Supabase or Firebase) makes sense.

---

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the Vercel walkthrough and pointing a
custom domain at it.

---

## Project layout

```
src/
├── config/
│   └── areas.js        ← YOUR HOME. Edit this to change rooms and chores.
├── lib/
│   ├── date.js         Date helpers (weeks, streak-safe day math)
│   ├── schedule.js     Decides if a task is due, resting, overdue, done
│   ├── stats.js        Streaks, points, progress bars
│   ├── storage.js      Reads and writes localStorage
│   └── calendar.js     Builds the .ics calendar file
├── components/
│   ├── Dashboard.jsx   The master view: stats, what's due, area cards
│   ├── AreaView.jsx    A single area, opened by an NFC tag
│   ├── TaskCard.jsx    One task row with its Log button
│   └── ProgressBar.jsx
└── App.jsx             Routing (via the URL hash) and app state
```

Built with React, Vite, Tailwind CSS, and [Lucide](https://lucide.dev) icons.
