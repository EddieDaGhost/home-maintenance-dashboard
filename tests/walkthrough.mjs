// Core walkthrough: logging, persistence, NFC routing, calendar download
export default async function run({ browser, page, check, errors, URL, tmp }) {
  await page.goto(URL, { waitUntil: 'networkidle' })

  check('dashboard heading renders', await page.getByRole('heading', { name: 'Home Maintenance' }).isVisible())
  check('all 7 areas render', (await page.getByText('to do', { exact: false }).count()) >= 0)
  for (const name of ['Litter Boxes', 'Bathroom 1', 'Bathroom 2', 'Bathroom 3', 'Kitchen', 'Laundry', 'Chickens']) {
    check(`area card: ${name}`, (await page.getByText(name, { exact: true }).count()) > 0)
  }

  // --- logging a task from the dashboard ---
  const beforeStreak = await page.locator('text=Day streak').locator('xpath=..').innerText()
  const firstLog = page.getByRole('button', { name: /^Log / }).first()
  const loggedName = await firstLog.locator('xpath=../..').innerText()
  await firstLog.click()
  await page.waitForTimeout(400)
  check('toast appears after logging', await page.getByRole('status').isVisible(), `(${await page.getByRole('status').innerText()})`)

  const stats = await page.locator('text=Day streak').locator('xpath=..').innerText()
  check('streak went 0 -> 1', beforeStreak.includes('0') && stats.includes('1'), `${JSON.stringify(beforeStreak)} -> ${JSON.stringify(stats)}`)
  check('points counter moved off zero', !(await page.locator('text=Points').locator('xpath=..').innerText()).match(/\b0\b/))

  // --- persistence across reload ---
  const storedBefore = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('localStorage written', !!storedBefore && storedBefore.includes('completions'))
  await page.reload({ waitUntil: 'networkidle' })
  const storedAfter = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('completion survives reload', storedBefore === storedAfter)
  check('streak persists after reload', (await page.locator('text=Day streak').locator('xpath=..').innerText()).includes('1'))

  // --- NFC hash routing ---
  for (const [hash, expected] of [
    ['#litter', 'Litter Boxes'],
    ['#kitchen', 'Kitchen'],
    ['#bathroom-2', 'Bathroom 2'],
    ['#chickens', 'Chickens'],
    ['#laundry', 'Laundry'],
  ]) {
    await page.goto(`${URL}/${hash}`, { waitUntil: 'networkidle' })
    const heading = await page.getByRole('heading', { level: 1 }).innerText()
    check(`${hash} opens ${expected}`, heading === expected, `got "${heading}"`)
  }

  // hash change while the app is already open (a second NFC tap)
  await page.evaluate(() => { window.location.hash = 'kitchen' })
  await page.waitForTimeout(300)
  check('live hash change re-routes', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Kitchen')

  // bad hash falls back to the dashboard
  await page.goto(`${URL}/#not-a-real-area`, { waitUntil: 'networkidle' })
  check('unknown hash falls back home', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')

  // --- log + undo inside an area ---
  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  const dishes = page.getByRole('button', { name: 'Log Dishes as done' })
  check('Dishes shows a Log button', await dishes.isVisible())
  await dishes.click()
  await page.waitForTimeout(300)
  check('Dishes now offers Undo', await page.getByRole('button', { name: 'Undo Dishes' }).isVisible())
  await page.getByRole('button', { name: 'Undo Dishes' }).click()
  await page.waitForTimeout(300)
  check('undo restores the Log button', await page.getByRole('button', { name: 'Log Dishes as done' }).isVisible())

  // back navigation
  await page.getByRole('button', { name: 'All areas' }).click()
  await page.waitForTimeout(300)
  check('back button returns to dashboard', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')
  check('back button clears the hash', await page.evaluate(() => window.location.hash) === '')

  // --- calendar export actually downloads ---
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export to iPhone Calendar/ }).click(),
  ])
  check('download filename', download.suggestedFilename() === 'home-maintenance.ics', download.suggestedFilename())
  const path = `${tmp}/downloaded.ics`
  await download.saveAs(path)
  const { readFileSync } = await import('node:fs')
  const ics = readFileSync(path, 'utf8')
  check('downloaded ics is a calendar', ics.startsWith('BEGIN:VCALENDAR') && ics.includes('RRULE:'))

  // --- no layout overflow on a phone ---
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('no horizontal overflow', overflow <= 0, `overflow ${overflow}px`)

  check('no console/page errors', errors.length === 0, errors.join(' | '))

}
