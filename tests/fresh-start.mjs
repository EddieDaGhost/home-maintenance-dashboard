// Drawing a line under a backlog.
//
// The whole feature turns on one promise: it changes what the app *says*, never
// what it has *stored*. So most of this suite is measuring things before and
// after and insisting they didn't move.

const LOG_KEY = 'home-maintenance-dashboard/v1'
const AWAY_KEY = 'home-maintenance-dashboard/away/v1'
const DAY = 86400000

const daysAgo = (n) => Date.now() - n * DAY

/** Months of neglect: nothing touched for a long time, plus a live streak. */
const BACKLOG = {
  'litter-full-change': [daysAgo(40)],
  'chickens-checkin': [daysAgo(30)],
  'chickens-deep-clean': [daysAgo(200)],
  'bath1-deep-clean': [daysAgo(90)],
  // Two recent days so there's a streak and a credit balance to protect.
  'kitchen-dishes': [daysAgo(0), daysAgo(1)],
}

const readAll = (page) =>
  page.evaluate(
    ([logKey]) => {
      const streakTile = [...document.querySelectorAll('p.numeral')][0]?.textContent ?? ''
      return {
        history: localStorage.getItem(logKey),
        streak: streakTile,
        credits: document.body.innerText.match(/(\d+) cr to spend/)?.[1] ?? null,
      }
    },
    [LOG_KEY],
  )

const openFresh = async (page) => {
  await page.getByRole('button', { name: /^Start fresh/ }).click()
  await page.waitForTimeout(300)
}

export default async function run({ page, check, errors, URL }) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([logKey, awayKey, log]) => {
      localStorage.setItem(logKey, JSON.stringify({ version: 2, completions: log }))
      localStorage.removeItem(awayKey)
    },
    [LOG_KEY, AWAY_KEY, BACKLOG],
  )
  await page.goto(URL, { waitUntil: 'networkidle' })

  // ---- the wall ----
  check('there is a backlog to look at', (await page.getByText(/days past due/).count()) > 0)
  const before = await readAll(page)
  check('and a streak worth protecting', before.streak === '2', before.streak)
  check('and some credits', Number(before.credits) > 0, String(before.credits))

  // ---- the sheet is honest about what it does ----
  await openFresh(page)
  const sheet = page.getByRole('dialog', { name: 'Start fresh' })
  check('the sheet promises not to fake anything', (await sheet.getByText(/won't give you points or credits you didn't earn/).count()) === 1)
  check('and not to delete anything', (await sheet.getByText(/Nothing is deleted/).count()) === 1)

  await sheet.getByRole('button', { name: 'Start fresh from today' }).click()
  await page.waitForTimeout(500)

  // ---- what changed: only the wording ----
  check('nothing is described as past due any more', (await page.getByText(/days past due/).count()) === 0)
  check(
    'and nothing scolds',
    (await page.getByText(/\b(late|overdue|missed|failed)\b/i).count()) === 0,
  )
  check('the work is still on the list', (await page.getByRole('button', { name: /^Log /}).count()) > 0)
  check('worded as an invitation', (await page.getByText(/Worth doing when you can/).count()) > 0)

  // ---- what didn't change: everything that matters ----
  const after = await readAll(page)
  check('the history is byte-for-byte the same', after.history === before.history)
  check('the streak is untouched', after.streak === before.streak, `${before.streak} -> ${after.streak}`)
  check('the credits are untouched', after.credits === before.credits, `${before.credits} -> ${after.credits}`)

  // ---- the scene notices ----
  await page.getByRole('button', { name: /cr to spend/ }).click()
  await page.waitForTimeout(400)
  check('the scene is lively again', (await page.getByText(/Full sun/).count()) === 1)
  await page.getByRole('button', { name: 'All areas' }).click()
  await page.waitForTimeout(300)

  // ---- it holds, and it can be undone ----
  await page.reload({ waitUntil: 'networkidle' })
  check('it survives a reload', (await page.getByText(/days past due/).count()) === 0)
  await openFresh(page)
  check('the sheet says when the line was drawn', (await sheet.getByText(/Fresh since/).count()) === 1)
  await sheet.getByRole('button', { name: /Undo it/ }).click()
  await page.waitForTimeout(500)
  check('undoing brings the honest picture back', (await page.getByText(/days past due/).count()) > 0)
  check('with the history still intact', (await readAll(page)).history === before.history)

  // ---- logging one puts that chore back on its own clock ----
  await openFresh(page)
  await sheet.getByRole('button', { name: 'Start fresh from today' }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Log Flock check-in as done' }).click()
  await page.waitForTimeout(500)
  // Logging it hands that chore back to its own clock — the pardon only ever
  // applied to things untouched since the line was drawn.
  const logged = await page.evaluate(
    ([key]) => JSON.parse(localStorage.getItem(key)).completions['chickens-checkin'].length,
    [LOG_KEY],
  )
  check('a pardoned chore can still be logged', logged === 2, `${logged} entries`)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll', !overflow)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
