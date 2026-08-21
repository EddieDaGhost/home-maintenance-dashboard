// Whose job is it.
//
// The logic suite already holds the rotation arithmetic. What it can't see is
// the part that matters most: that assigning a chore to somebody else does not
// stop you logging it. Assignment is a hint, and this suite is what keeps it
// one — the moment it becomes a lock, design rule 4 is gone.

const PEOPLE_KEY = 'home-maintenance-dashboard/people/v1'
const CUSTOM_KEY = 'home-maintenance-dashboard/custom/v1'
const LOG_KEY = 'home-maintenance-dashboard/v1'

const HOUSE = {
  people: [
    { id: 'eddie', name: 'Eddie' },
    { id: 'yas', name: 'Yasmine' },
  ],
  activeId: 'eddie',
}

async function seed(page, URL, { custom = null, completions = {} } = {}) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([peopleKey, customKey, logKey, house, over, log]) => {
      localStorage.setItem(peopleKey, JSON.stringify(house))
      localStorage.setItem(logKey, JSON.stringify({ version: 2, completions: log }))
      if (over) localStorage.setItem(customKey, JSON.stringify(over))
      else localStorage.removeItem(customKey)
    },
    [PEOPLE_KEY, CUSTOM_KEY, LOG_KEY, HOUSE, custom, completions],
  )
  await page.goto(URL, { waitUntil: 'networkidle' })
}

export default async function run({ page, check, errors, URL }) {
  // ---- with one person, none of this exists ----
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.goto(`${URL}/#litter`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const solo = page.getByRole('dialog', { name: 'Edit room' })
  await solo.getByRole('button', { name: 'Settings for Scoop all 3 boxes' }).click()
  await page.waitForTimeout(250)
  check('a one-person house is not asked whose job it is', (await solo.getByLabel(/^Who does /).count()) === 0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // ---- assign one from the edit sheet ----
  await seed(page, URL)
  await page.goto(`${URL}/#litter`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const room = page.getByRole('dialog', { name: 'Edit room' })
  await room.getByRole('button', { name: 'Settings for Scoop all 3 boxes' }).click()
  await page.waitForTimeout(250)

  const picker = room.getByLabel('Who does Scoop all 3 boxes')
  check('a shared house is asked', (await picker.count()) === 1)
  check('and starts on nobody in particular', (await picker.inputValue()) === '')

  await picker.selectOption('yas')
  await page.waitForTimeout(300)
  check('it says it is a reminder, not a lock', (await room.getByText(/not a lock/).count()) === 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ---- the chip shows, and the Log button is untouched ----
  check("the card says whose it is", (await page.getByText('Yasmine', { exact: true }).count()) > 0)
  const log = page.getByRole('button', { name: 'Log Scoop all 3 boxes as done' })
  check('somebody else’s chore is still one tap for you', (await log.count()) === 1)
  check(
    'and nothing about it is a telling off',
    (await page.getByText(/\b(late|overdue|missed|failed)\b/i).count()) === 0,
  )

  await log.click()
  await page.waitForTimeout(400)
  const logged = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw).completions['litter-scoop'] ?? []).length : 0
  }, LOG_KEY)
  check('logging it actually worked', logged === 1, `${logged} completions`)

  // ---- taking turns ----
  // Checked inside the room rather than on the dashboard, whose queue is a
  // five-item shortlist and might not be showing this chore at all.
  await seed(page, URL, { custom: { taskSettings: { 'chickens-checkin': { assignee: 'rotate' } } } })
  await page.goto(`${URL}/#chickens`, { waitUntil: 'networkidle' })
  check('a rotation nobody has done starts at the top of the roster', (await page.getByText('Your turn').count()) === 1)

  await page.getByRole('button', { name: 'Log Flock check-in as done' }).click()
  await page.waitForTimeout(600)
  check('doing it passes it on', (await page.getByText("Yasmine's turn").count()) === 1)
  check('and it is no longer your turn', (await page.getByText('Your turn').count()) === 0)
  check(
    'and passing it on is not phrased as a failure',
    (await page.getByText(/\b(late|overdue|missed|failed)\b/i).count()) === 0,
  )

  // ---- the Mine filter keeps what nobody has claimed ----
  // Dishes is daily, so it is reliably in the queue whatever day this runs —
  // litter-scoop is Mon/Wed/Fri and would be resting half the week.
  await seed(page, URL, {
    custom: {
      taskSettings: {
        'kitchen-dishes': { assignee: 'yas' },
        'chickens-checkin': { assignee: 'eddie' },
      },
    },
  })
  // The queue is a shortlist, so the honest number is the one in its header.
  const queueTotal = async () => {
    const text = await page.getByText(/showing \d+ of \d+/).innerText()
    return Number(/of (\d+)/.exec(text)[1])
  }
  const all = await queueTotal()
  await page.getByRole('button', { name: 'Mine' }).click()
  await page.waitForTimeout(400)
  const mine = await queueTotal()
  check('Mine narrows the list', mine < all, `${mine} of ${all}`)
  check('but keeps chores nobody has claimed', mine > 1, `${mine}`)
  check('exactly one chore was hers to drop', all - mine === 1, `dropped ${all - mine}`)
  check('and it is gone from the list', (await page.getByRole('button', { name: 'Log Dishes as done' }).count()) === 0)
  check('while yours is still there', (await page.getByRole('button', { name: 'Log Flock check-in as done' }).count()) === 1)

  await page.getByRole('button', { name: 'Mine' }).click()
  await page.waitForTimeout(300)
  check('turning it off puts everything back', (await queueTotal()) === all)

  // ---- assignment survives a reload and never moves an id ----
  await page.reload({ waitUntil: 'networkidle' })
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).taskSettings : null
  }, CUSTOM_KEY)
  check('assignment survives a reload', Boolean(stored), JSON.stringify(stored))
  check('stored against the task id, so no id ever moved', stored?.['kitchen-dishes']?.assignee === 'yas', JSON.stringify(stored))
  check('and nothing else was written alongside it', Object.keys(stored?.['kitchen-dishes'] ?? {}).join() === 'assignee')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll', !overflow)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
