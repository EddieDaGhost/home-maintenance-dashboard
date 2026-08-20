// Typing a whole house in at once.
//
// The parser itself is held by the logic suite, line by line. What this covers
// is the thing that makes a bulk edit safe to offer at all: that you see
// exactly what will happen before anything is written, and that a chore you
// already have is updated rather than duplicated.

const CUSTOM_KEY = 'home-maintenance-dashboard/custom/v1'
const LOG_KEY = 'home-maintenance-dashboard/v1'

const openImport = async (page) => {
  await page.getByRole('button', { name: /^Import a list/ }).click()
  await page.waitForTimeout(350)
  return page.getByRole('dialog', { name: 'Import a list' })
}

export default async function run({ page, check, errors, URL }) {
  // Dishes has a history, so "updated not duplicated" is a real claim here.
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([logKey, at]) => {
      localStorage.setItem(logKey, JSON.stringify({ version: 2, completions: { 'kitchen-dishes': [at] } }))
    },
    [LOG_KEY, Date.now() - 3600000],
  )
  await page.goto(URL, { waitUntil: 'networkidle' })

  const sheet = await openImport(page)
  check('it explains the shape of a line', (await sheet.getByText(/Room: Task, how often, points/).count()) === 1)
  check('and nothing is offered to import yet', (await sheet.getByRole('button', { name: 'Nothing to import yet' }).count()) === 1)

  // ---- a preview, before anything is written ----
  await sheet.locator('#import-text').fill(
    [
      'Kitchen: Wipe the counters, 2x per week, 3',
      'Mop the floor, weekly, 5',
      'Garage: Sweep the floor, every 2 weeks',
      'Tidy the bench, 7',
      'Kitchen: Dishes, daily, 12',
      'Kitchen: Broken, whenever I fancy',
    ].join('\n'),
  )
  await page.waitForTimeout(400)

  check('the new room is named before it is made', (await sheet.getByText('Garage', { exact: true }).count()) > 0)
  check('every task is listed', (await sheet.getByText('Wipe the counters').count()) > 0)
  check('with the room it carried down to', (await sheet.getByText(/Garage · Every 2 weeks/).count()) === 1)
  check('a missing schedule shows the default it will get', (await sheet.getByText(/once a week/).count()) > 0)
  check('an existing chore says it will be updated', (await sheet.getByText(/already exists, will be updated/).count()) === 1)
  check('and that its history is safe', (await sheet.getByText(/keeps its history/).count()) === 1)
  check('the bad line is named by number', (await sheet.getByText(/Line 6/).count()) === 1)
  check('with a reason', (await sheet.getByText(/isn't a schedule or a number/).count()) === 1)
  check('and it does not block the rest', (await sheet.getByText(/Everything else still imports/).count()) === 1)

  const button = sheet.getByRole('button', { name: /^Import / })
  check('the button says exactly what it will do', /4 new, 1 updated/.test(await button.innerText()), await button.innerText())

  // ---- nothing has been written yet ----
  const beforeCommit = await page.evaluate((key) => localStorage.getItem(key), CUSTOM_KEY)
  check('nothing is stored until the button', beforeCommit === null, String(beforeCommit))

  // ---- closing without importing changes nothing ----
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await page.waitForTimeout(300)
  check('cancelling writes nothing', (await page.evaluate((key) => localStorage.getItem(key), CUSTOM_KEY)) === null)

  // ---- do it ----
  const again = await openImport(page)
  await again.locator('#import-text').fill(
    [
      'Kitchen: Wipe the counters, 2x per week, 3',
      'Garage: Sweep the floor, every 2 weeks',
      'Tidy the bench, 7',
      'Kitchen: Dishes, daily, 12',
    ].join('\n'),
  )
  await page.waitForTimeout(400)
  await again.getByRole('button', { name: /^Import / }).click()
  await page.waitForTimeout(700)

  check('it says what it did', /3 added, 1 updated/.test(await page.getByRole('status').innerText()), await page.getByRole('status').innerText())

  // ---- the room and its tasks are real ----
  check('the new room is on the dashboard', (await page.getByText('Garage').count()) > 0)
  await page.goto(`${URL}/#garage`, { waitUntil: 'networkidle' })
  check('with both its tasks', (await page.getByText('Sweep the floor').count()) > 0 && (await page.getByText('Tidy the bench').count()) > 0)
  check('and the schedule it was given', (await page.getByText('Every 2 weeks').count()) > 0)
  check('a task with no schedule got the default', (await page.getByText('Once a week').count()) > 0)

  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  check('the imported task landed in the right room', (await page.getByText('Wipe the counters').count()) > 0)

  // The load-bearing claim: an existing chore was edited, not replaced.
  const dishes = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).completions['kitchen-dishes']?.length ?? 0 : 0
  }, LOG_KEY)
  check('an existing chore kept its history', dishes === 1, `${dishes} entries`)
  const dishRows = await page.getByRole('button', { name: /Dishes as done$|^Undo Dishes$/ }).count()
  check('and there is exactly one of it, not two', dishRows === 1, `${dishRows} rows`)

  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const kitchen = page.getByRole('dialog', { name: 'Edit room' })
  await kitchen.getByRole('button', { name: 'Settings for Dishes' }).click()
  await page.waitForTimeout(250)
  check('and is worth what the list said', (await kitchen.getByLabel('Points for Dishes').inputValue()) === '12')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // ---- importing the same list again adds nothing ----
  await page.goto(URL, { waitUntil: 'networkidle' })
  const third = await openImport(page)
  await third.locator('#import-text').fill('Garage: Sweep the floor, every 2 weeks')
  await page.waitForTimeout(400)
  check('a chore you already have is never added twice', (await third.getByText(/already exists, will be updated/).count()) === 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll', !overflow)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
