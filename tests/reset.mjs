// Starting over, on one phone.
//
// tests/sync.mjs covers the hard half — that a reset survives the other phone
// pushing its copy back. This is the half that decides whether the feature is
// safe to offer at all: that it clears what you did and leaves what you set up,
// and that it takes two deliberate taps to get there.

const LOG_KEY = 'home-maintenance-dashboard/v1'
const CUSTOM_KEY = 'home-maintenance-dashboard/custom/v1'
const ESTATE_KEY = 'home-maintenance-dashboard/estate/v1'
const AWAY_KEY = 'home-maintenance-dashboard/away/v1'
const PLACES_KEY = 'home-maintenance-dashboard/places/v1'

const DAY = 86400000
const dayOffset = (n) => {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  return d.getTime() + n * DAY
}

const openReset = async (page) => {
  await page.getByRole('button', { name: /^Start over/ }).click()
  await page.waitForTimeout(350)
  return page.getByRole('dialog', { name: 'Start over' })
}

export default async function run({ page, check, errors, URL }) {
  // A lived-in app: history, an added room, an edited task, a purchase, a trip
  // and a town. Only two of those should be gone afterwards.
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([keys, offsets]) => {
      localStorage.setItem(
        keys.log,
        JSON.stringify({
          version: 2,
          completions: {
            'kitchen-dishes': [offsets.today, offsets.yesterday],
            'litter-scoop': [offsets.older],
          },
        }),
      )
      localStorage.setItem(
        keys.custom,
        JSON.stringify({
          areas: [{ id: 'garage', name: 'Garage', iconName: 'car', color: 'violet' }],
          tasks: { garage: [{ id: 'garage-sweep', name: 'Sweep the floor', schedule: { kind: 'weekly' }, points: 6 }] },
          hidden: [],
          appearance: {},
          taskSettings: { 'kitchen-dishes': { points: 25, repeatable: true } },
        }),
      )
      localStorage.setItem(
        keys.estate,
        JSON.stringify({ me: { looks: { home: { owned: ['finish-terracotta'], equipped: { finish: 'finish-terracotta' }, companions: [] } }, spent: 60, boostUntil: 0 } }),
      )
      localStorage.setItem(keys.away, JSON.stringify({ windows: [{ from: offsets.tripFrom, to: offsets.tripTo }], freshStartAt: offsets.older }))
      localStorage.setItem(keys.places, JSON.stringify({ home: null, work: '100 Main St' }))
    },
    [
      { log: LOG_KEY, custom: CUSTOM_KEY, estate: ESTATE_KEY, away: AWAY_KEY, places: PLACES_KEY },
      {
        today: dayOffset(0),
        yesterday: dayOffset(-1),
        older: dayOffset(-9),
        tripFrom: dayOffset(-30),
        tripTo: dayOffset(-25),
      },
    ],
  )
  await page.goto(URL, { waitUntil: 'networkidle' })

  const streak = () => page.getByText('Day streak').locator('..').locator('p.numeral').innerText()
  check('the app has a history to lose', (await streak()) !== '0', await streak())

  // ---- the sheet states the cost, and doesn't hand you the button ----
  const sheet = await openReset(page)
  check('it says it cannot be undone', (await sheet.getByText('This cannot be undone').count()) === 1)
  check('it counts what goes', (await sheet.getByText(/3 logged completions across 2 tasks/).count()) === 1)
  check('including what was bought', (await sheet.getByText(/1 purchase and 60 credits spent/).count()) === 1)
  check('it lists what it keeps', (await sheet.getByText(/Every room and task you added/).count()) === 1)
  check('it offers a backup first', (await sheet.getByRole('button', { name: /Back up first/ }).count()) === 1)
  check('and the real button is not there yet', (await sheet.getByRole('button', { name: /^Yes — clear/ }).count()) === 0)

  await sheet.getByRole('button', { name: 'Reset everything' }).click()
  await page.waitForTimeout(250)
  check('one tap arms it', (await sheet.getByRole('button', { name: /^Yes — clear 3 entries/ }).count()) === 1)
  check('and backing out is offered alongside', (await sheet.getByRole('button', { name: 'No, keep everything' }).count()) === 1)

  // ---- backing out really does nothing ----
  await sheet.getByRole('button', { name: 'No, keep everything' }).click()
  await page.waitForTimeout(250)
  check('backing out disarms it', (await sheet.getByRole('button', { name: /^Yes — clear/ }).count()) === 0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('and nothing was cleared', (await streak()) !== '0', await streak())

  // Reopening must not land on a primed button.
  const again = await openReset(page)
  check('reopening starts unarmed', (await again.getByRole('button', { name: /^Yes — clear/ }).count()) === 0)

  // ---- go through with it ----
  await again.getByRole('button', { name: 'Reset everything' }).click()
  await page.waitForTimeout(250)
  await again.getByRole('button', { name: /^Yes — clear/ }).click()
  await page.waitForTimeout(700)

  check('it says so', (await page.getByRole('status').innerText()).includes('Back to zero'))
  check('the streak is zero', (await streak()) === '0', await streak())

  const left = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return 0
    return Object.values(JSON.parse(raw).completions).reduce((n, list) => n + list.length, 0)
  }, LOG_KEY)
  check('every completion is gone', left === 0, `${left} left`)
  check('and the estate with it', (await page.evaluate((k) => localStorage.getItem(k), ESTATE_KEY)) === null)

  // ---- and now the half that matters: what it kept ----
  check('the room you added is still there', (await page.getByText('Garage').count()) > 0)
  await page.goto(`${URL}/#garage`, { waitUntil: 'networkidle' })
  check('with the task you put in it', (await page.getByText('Sweep the floor').count()) > 0)

  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const kitchen = page.getByRole('dialog', { name: 'Edit room' })
  await kitchen.getByRole('button', { name: 'Settings for Dishes' }).click()
  await page.waitForTimeout(250)
  check('an edited task keeps what you made it worth', (await kitchen.getByLabel('Points for Dishes').inputValue()) === '25')
  check('and that it repeats', await kitchen.getByLabel('Let Dishes be logged more than once').isChecked())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const kept = await page.evaluate(
    ([awayKey, placesKey]) => ({
      trips: JSON.parse(localStorage.getItem(awayKey) ?? 'null'),
      places: JSON.parse(localStorage.getItem(placesKey) ?? 'null'),
    }),
    [AWAY_KEY, PLACES_KEY],
  )
  check('your trips are kept — they are where you were', kept.trips?.windows?.length === 1, JSON.stringify(kept.trips))
  check('the fresh-start line goes, having nothing left to cover', kept.trips?.freshStartAt === 0)
  check('and your work address is untouched', kept.places?.work === '100 Main St', JSON.stringify(kept.places))

  // ---- with nothing to clear, it says so rather than offering a button ----
  await page.goto(URL, { waitUntil: 'networkidle' })
  const empty = await openReset(page)
  check('an empty app has nothing to reset', (await empty.getByText(/Nothing to clear/).count()) === 1)
  check('and offers no button at all', (await empty.getByRole('button', { name: 'Reset everything' }).count()) === 0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll', !overflow)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
