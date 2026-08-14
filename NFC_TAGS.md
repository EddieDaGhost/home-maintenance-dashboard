# NFC Tags

The point of the tags: you're already standing at the litter box holding the
scoop. Tap the wall, tap **Log**, walk away. No unlocking, no hunting for an app,
no deciding what to do next.

---

## What to buy

**NTAG215 stickers, 50-pack, around $15–20 on Amazon.** Search "NTAG215 NFC
stickers."

- **NTAG215** (504 bytes) is the safe pick. NTAG213 (144 bytes) also holds a
  short URL fine, but 215 costs the same and leaves you room.
- **Get white or printable ones** so you can label them.
- **You need 8.** Buy 50 anyway — they're cheap, you'll mess a couple up, and
  you'll think of new places to put them.

**One thing to watch:** plain NFC stickers don't work stuck directly to metal —
the metal detunes the antenna. If a tag is going on the washer, the dryer, or a
metal cabinet, either buy **"on-metal" / "anti-metal" NFC tags**, or stick the
regular one on the wall next to the appliance instead. Easiest fix is usually to
pick a different surface.

---

## What to write on each tag

Replace `https://homemaintenance.app` with whatever your live URL is — the
`.vercel.app` one works exactly as well.

| Tag | Write this URL | Where it goes |
|---|---|---|
| **Master** | `https://homemaintenance.app` | Fridge, or by the front door |
| **Litter** | `https://homemaintenance.app/#litter` | Wall above the boxes |
| **Bathroom 1** | `https://homemaintenance.app/#bathroom-1` | Mirror or door frame |
| **Bathroom 2** | `https://homemaintenance.app/#bathroom-2` | Mirror or door frame |
| **Bathroom 3** | `https://homemaintenance.app/#bathroom-3` | Mirror or door frame |
| **Kitchen** | `https://homemaintenance.app/#kitchen` | Side of the fridge |
| **Laundry** | `https://homemaintenance.app/#laundry` | Wall above the machines |
| **Chickens** | `https://homemaintenance.app/#chickens` | Coop door, under the overhang |

The hash has to match exactly — lowercase, with the hyphen. `#Bathroom1` won't
work; `#bathroom-1` will.

⚠️ **Wait until your final URL is live before writing tags.** If you write them
against `.vercel.app` and later move to a custom domain, you're rewriting all
eight.

---

## Writing them

1. Install **NFC Tools** (free, iOS and Android) — or **NXP TagWriter** on Android.
2. Open it → **Write** → **Add a record** → **URL/URI**.
3. Paste the full URL including `https://`.
4. **Write**, then hold the tag against the top of your phone until it confirms.
   On an iPhone, the NFC antenna is at the very top edge of the back.
5. Tap it once with the phone locked to confirm the banner appears.

iPhones read NFC tags from the lock screen with no app open — a notification
banner slides down and you tap it. That's the whole interaction.

**Optionally lock the tags.** NFC Tools has a "Lock tag" option that makes a tag
permanently read-only. Only do this once you've tested the tag and you're certain
about the URL — locking cannot be undone.

---

## Placement notes

- **Mount at hand height, where you're already standing.** A tag you have to
  bend down for is a tag you stop using.
- **Label them.** A blank white sticker on the wall is a mystery in three months.
  A label maker, or just a Sharpie on the tag.
- **The coop tag needs weather protection.** Even "waterproof" stickers give up
  outdoors over a winter. Put it under the overhang out of direct rain, or seal
  it with a strip of clear packing tape over the top. Cold slows nothing down —
  NFC works fine in freezing weather.
- **Don't stack tags.** Two tags within an inch or two of each other confuse the
  reader.

---

## If a tag doesn't read

| Problem | Fix |
|---|---|
| Nothing happens | Move the phone slowly across the tag — the iPhone antenna is a small spot at the top back edge |
| Worked, then stopped | Check it isn't on metal, or that something metal didn't get placed behind it |
| Opens the dashboard, not the area | The hash is wrong or capitalized — rewrite it |
| Opens the wrong area | Two tags too close together, or the wrong URL got written |
| Won't rewrite | You locked it. It's read-only forever — use a new sticker |
