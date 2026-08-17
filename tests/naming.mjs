// Renaming, NFC tag setup, and backup/restore
import { readFileSync, writeFileSync } from 'node:fs'

export default async function run({ browser, page, check, errors, URL, tmp }) {
  await page.goto(`${URL}/#bathroom-1`, { waitUntil: 'networkidle' })
  check('area opens with default name', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Bathroom 1')

  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const sheet = page.getByRole('dialog', { name: 'Edit room' })
  check('edit-room sheet opens', await sheet.isVisible())
  check('form is prefilled with current name', (await sheet.locator('#area-name').inputValue()) === 'Bathroom 1')
  check('tag reassurance is shown', (await sheet.getByText(/Your NFC tag keeps working/).count()) === 1)

  await sheet.locator('#area-name').fill("Kids' Bathroom")
  await sheet.locator('#area-subtitle').fill('Upstairs, by the stairs')
  await sheet.getByLabel('Name for Wipe mirror').fill('Mirror & counter')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(400)

  check('header shows the new room name', (await page.getByRole('heading', { level: 1 }).innerText()) === "Kids' Bathroom")
  check('subtitle updated', (await page.getByText('Upstairs, by the stairs').count()) === 1)
  check('task renamed', (await page.getByText('Mirror & counter').count()) > 0)
  check('untouched task keeps its name', (await page.getByText('Deep clean', { exact: true }).count()) > 0)

  // the rename must not disturb the tag URL or the history key
  check('NFC hash still routes here', await page.evaluate(() => window.location.hash) === '#bathroom-1')
  await page.reload({ waitUntil: 'networkidle' })
  check('rename survives reload', (await page.getByRole('heading', { level: 1 }).innerText()) === "Kids' Bathroom")
  await page.goto(`${URL}/#bathroom-1`, { waitUntil: 'networkidle' })
  check('tag URL opens the renamed room', (await page.getByRole('heading', { level: 1 }).innerText()) === "Kids' Bathroom")

  // logging under the new name still writes to the original task id
  await page.getByRole('button', { name: 'Log Mirror & counter as done' }).click()
  await page.waitForTimeout(300)
  const stored = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('history is filed under the original task id', stored.includes('bath1-mirror'), stored.slice(0, 80))

  // dashboard reflects it too
  await page.goto(URL, { waitUntil: 'networkidle' })
  check('dashboard shows the custom name', (await page.getByText("Kids' Bathroom").count()) > 0)

  // ===================== CALENDAR USES CUSTOM NAMES =====================
  const [icsDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export to iPhone Calendar/ }).click(),
  ])
  await icsDownload.saveAs(`${tmp}/named.ics`)
  const ics = readFileSync(`${tmp}/named.ics`, 'utf8')
  check('calendar uses the custom room name', ics.includes("Kids' Bathroom"))
  check('calendar uses the custom task name', ics.includes('Mirror & counter'))
  check('calendar still lists every task', (ics.match(/BEGIN:VEVENT/g) || []).length === 18)

  // ===================== TAG SETUP =====================
  await page.getByRole('button', { name: /NFC tag setup/ }).click()
  await page.waitForTimeout(400)
  const tags = page.getByRole('dialog', { name: 'NFC tag setup' })
  check('tag setup opens', await tags.isVisible())
  const urls = await tags.locator('p.font-mono').allInnerTexts()
  check('lists master + 7 areas', urls.length === 8, `${urls.length} rows`)
  check('uses the address you are on', urls.every((u) => u.startsWith(URL)), urls[0])
  check('area hashes are correct', urls.slice(1).join(' ') === [
    'litter', 'bathroom-1', 'bathroom-2', 'bathroom-3', 'kitchen', 'laundry', 'chickens',
  ].map((id) => `${URL}/#${id}`).join(' '), urls[2])
  check('renamed room is labelled with its new name', (await tags.getByText("Kids' Bathroom").count()) > 0)

  await tags.getByRole('button', { name: /Copy the Kids' Bathroom tag address/ }).click()
  await page.waitForTimeout(300)
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  check('copy button copies the right URL', clipboard === `${URL}/#bathroom-1`, clipboard)
  check('button confirms the copy', (await tags.getByText('Copied').count()) === 1)
  await tags.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(300)

  // ===================== BACKUP =====================
  const [backup] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Back up my data/ }).click(),
  ])
  const backupPath = `${tmp}/backup.json`
  await backup.saveAs(backupPath)
  check('backup filename is dated', /^home-maintenance-backup-\d{4}-\d{2}-\d{2}\.json$/.test(backup.suggestedFilename()), backup.suggestedFilename())
  const parsed = JSON.parse(readFileSync(backupPath, 'utf8'))
  check('backup identifies the app', parsed.app === 'home-maintenance-dashboard')
  check('backup contains the history', Object.keys(parsed.completions).includes('bath1-mirror'))
  check('backup contains custom names', parsed.names['bathroom-1'].name === "Kids' Bathroom")
  // The newer fields ride along whether or not anything has been put in them,
  // so a restore can't quietly drop what a future version wrote.
  check('backup carries the estate', parsed.estate !== undefined)
  check('backup carries away windows', Array.isArray(parsed.away?.windows))

  // ===================== RESTORE =====================
  // Wipe everything, as if this were a new phone.
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  check('data is gone before restore', (await page.getByText("Kids' Bathroom").count()) === 0)

  await page.locator('input[type="file"]').setInputFiles(backupPath)
  await page.waitForTimeout(600)
  check('names come back', (await page.getByText("Kids' Bathroom").count()) > 0)
  const restored = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('history comes back', restored.includes('bath1-mirror'))

  // a file that isn't ours is rejected with a readable message, not a crash
  writeFileSync(`${tmp}/not-a-backup.json`, JSON.stringify({ hello: 'world' }))
  await page.locator('input[type="file"]').setInputFiles(`${tmp}/not-a-backup.json`)
  await page.waitForTimeout(500)
  const toast = await page.getByRole('status').innerText()
  check('bad file gets a plain-English error', /doesn't look like a Home Maintenance backup/.test(toast), `("${toast}")`)
  check('bad file leaves data intact', (await page.getByText("Kids' Bathroom").count()) > 0)

  // ===================== RESET NAMES =====================
  await page.goto(`${URL}/#bathroom-1`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Reset this room to its original names/ }).click()
  await page.waitForTimeout(400)
  check('reset restores the built-in name', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Bathroom 1')
  check('reset restores task names', (await page.getByText('Wipe mirror').count()) > 0)
  const afterReset = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('reset does NOT touch history', afterReset.includes('bath1-mirror'))

  // ===================== BOTH THEMES =====================
  for (const themeId of ['home', 'starship']) {
    await page.evaluate((id) => localStorage.setItem('home-maintenance-dashboard/theme', id), themeId)
    await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Edit room' }).click()
    await page.waitForTimeout(350)
    check(`edit-room sheet renders in ${themeId}`, await page.getByRole('dialog', { name: 'Edit room' }).isVisible())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`no horizontal overflow (${themeId})`, overflow <= 0, `${overflow}px`)
  }

  check('no console/page errors', errors.length === 0, errors.join(' | '))

}
