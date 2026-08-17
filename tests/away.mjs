// Going away.
//
// The point of this suite is the thing the logic suite can't see: that the
// dashboard actually goes quiet, that the streak survives a real reload, and
// that nothing on screen tells you off for having gone somewhere.

const LOG_KEY = 'home-maintenance-dashboard/v1'
const AWAY_KEY = 'home-maintenance-dashboard/away/v1'

const DAY = 86400000

/** A day-resolution timestamp n days from today, the way the store keeps them. */
const dayOffset = (n) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() + n * DAY
}

async function seed(page, URL, { completions = {}, away = null } = {}) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([logKey, awayKey, log, trips]) => {
      localStorage.setItem(logKey, JSON.stringify({ version: 2, completions: log }))
      if (trips) localStorage.setItem(awayKey, JSON.stringify(trips))
      else localStorage.removeItem(awayKey)
    },
    [LOG_KEY, AWAY_KEY, completions, away],
  )
  await page.goto(URL, { waitUntil: 'networkidle' })
}

const streak = (page) => page.getByText('Day streak').locator('..').locator('p.numeral').innerText()

const openAway = async (page) => {
  await page.getByRole('button', { name: /^Away/ }).click()
  await page.waitForTimeout(300)
}

export default async function run({ page, check, errors, URL }) {
  // A four-day streak that ended five days ago — stale on its own.
  const oldStreak = {
    'kitchen-dishes': [dayOffset(-5) + 3600000, dayOffset(-6) + 3600000, dayOffset(-7) + 3600000, dayOffset(-8) + 3600000],
  }

  // ---- without a trip, that history is just old ----
  await seed(page, URL, { completions: oldStreak })
  check('a stale streak reads zero', (await streak(page)) === '0', await streak(page))
  check('and there is plenty to do', (await page.getByRole('button', { name: /^Log /}).count()) > 0)

  // ---- book the trip from the sheet ----
  await openAway(page)
  const sheet = page.getByRole('dialog', { name: 'Away' })
  check('the sheet explains itself', (await sheet.getByText(/streak carries straight over/).count()) === 1)
  check('and says it is for the household', (await sheet.getByText(/whole household/).count()) === 1)

  const toField = (ts) => {
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  await sheet.locator('#away-from').fill(toField(dayOffset(-4)))
  await sheet.locator('#away-to').fill(toField(dayOffset(1)))
  await sheet.getByRole('button', { name: /^Away / }).click()
  await page.waitForTimeout(500)

  // ---- the dashboard goes quiet ----
  check('the banner appears', (await page.getByText(/Nothing's due, and your streak carries over/).count()) === 1)
  check('the streak survived the gap', (await streak(page)) === '4', await streak(page))
  check('nothing is on the plate', (await page.getByRole('button', { name: /^Log /}).count()) === 0)
  check('the all-clear shows instead', (await page.getByText(/Nothing is due right now/).count()) === 1)
  check(
    'and nothing calls you late',
    (await page.getByText(/\b(late|overdue|missed|failed|behind)\b/i).count()) === 0,
  )

  // Every room reads as handled rather than neglected.
  check('rooms read as all clear', (await page.getByText('All clear').count()) > 4)

  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  check('a tapped tag opens to a resting room', (await page.getByText(/Nothing due here right now/).count()) === 1)
  check('the task says away', (await page.getByText('Away', { exact: true }).count()) > 0)

  // ---- it survives a reload, which is the whole point of storing it ----
  await page.goto(URL, { waitUntil: 'networkidle' })
  check('still away after a reload', (await page.getByText(/Nothing's due, and your streak carries over/).count()) === 1)
  check('and the streak is still there', (await streak(page)) === '4')

  // ---- home early ----
  await page.getByRole('button', { name: "We're back" }).first().click()
  await page.waitForTimeout(500)
  check('the banner goes away', (await page.getByText(/Nothing's due, and your streak carries over/).count()) === 0)
  check('there is work to do again', (await page.getByRole('button', { name: /^Log /}).count()) > 0)
  check('but the streak kept what the trip protected', (await streak(page)) === '4', await streak(page))

  // ---- coming home is a list, not a reckoning ----
  await seed(page, URL, {
    // Badly overdue: a fortnightly job last done nearly three weeks ago.
    completions: { 'litter-full-change': [dayOffset(-19) + 3600000] },
    away: { windows: [{ from: dayOffset(-6), to: dayOffset(-1) }] },
  })
  check('back home, the work is listed', (await page.getByRole('button', { name: /Log Full litter change/ }).count()) === 1)
  check('worded gently on the first day back', (await page.getByText(/Back home — worth a look/).count()) === 1)
  check(
    'and still nothing scolding',
    (await page.getByText(/\b(late|overdue|missed|failed)\b/i).count()) === 0,
  )

  // ---- a trip can be called off before it starts ----
  await seed(page, URL, { completions: oldStreak })
  await openAway(page)
  await page.getByRole('dialog', { name: 'Away' }).getByRole('button', { name: 'A week' }).click()
  await page.waitForTimeout(400)
  check('a preset books a trip', (await page.getByText(/Nothing's due, and your streak carries over/).count()) === 1)
  await openAway(page)
  check('the booked trip is listed', (await page.getByRole('button', { name: /Cancel the trip on/ }).count()) === 1)
  await page.getByRole('dialog', { name: 'Away' }).getByRole('button', { name: /Cancel the trip on/ }).click()
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('cancelling it puts everything back', (await page.getByRole('button', { name: /^Log /}).count()) > 0)

  // ---- an empty away store leaves no key behind ----
  const stored = await page.evaluate((key) => localStorage.getItem(key), AWAY_KEY)
  check('no trips means no key', stored === null, String(stored))

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll', !overflow)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
