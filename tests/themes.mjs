// Theme switching, the starfield backdrop, and reduced motion
export default async function run({ browser, page, check, errors, URL, tmp }) {
  await page.goto(URL, { waitUntil: 'networkidle' })

  // --- default theme ---
  check('starts on the Homestead theme', await page.evaluate(() => document.documentElement.dataset.theme) === 'home')
  check('no starfield in Homestead', (await page.locator('.star-layer').count()) === 0)
  check('default title', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')

  // --- open the picker and switch ---
  await page.getByRole('button', { name: 'Change look' }).first().click()
  await page.waitForTimeout(300)
  check('picker opens', await page.getByRole('dialog', { name: 'Choose a look' }).isVisible())
  const dialog = page.getByRole('dialog', { name: 'Choose a look' })
  check('both themes offered', (await dialog.getByRole('button', { name: /Homestead|Starship/ }).count()) === 2)

  await dialog.getByRole('button', { name: /Starship/ }).click()
  await page.waitForTimeout(600)
  check('picker closes on choose', (await page.getByRole('dialog').count()) === 0)
  check('data-theme switched', await page.evaluate(() => document.documentElement.dataset.theme) === 'starship')
  check('starfield appears', (await page.locator('.star-layer').count()) === 3)
  check('stars rendered', (await page.locator('.star').count()) > 200)
  check('planet + nebulae present', (await page.locator('.nebula').count()) === 2)
  check('title uses theme copy', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Base One')
  check('stat labels renamed', (await page.getByText('Days online').count()) > 0)
  check('credits label', (await page.getByText('Credits').count()) > 0)
  check('section title renamed', (await page.getByText('Priority queue').count()) > 0)
  check('decks heading', (await page.getByText('Decks', { exact: true }).count()) > 0)

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  check('body went dark', bg === 'rgb(4, 7, 15)', bg)
  const inkOnCard = await page.evaluate(() => {
    const h = document.querySelector('h1')
    return getComputedStyle(h).color
  })
  check('text went light', inkOnCard === 'rgb(232, 244, 255)', inkOnCard)
  const statusBar = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content)
  check('iOS status bar color updated', statusBar === '#04070f', statusBar)

  // --- theme persists across reload ---
  await page.reload({ waitUntil: 'networkidle' })
  check('theme persists after reload', await page.evaluate(() => document.documentElement.dataset.theme) === 'starship')
  check('starfield still there', (await page.locator('.star-layer').count()) === 3)

  // --- logging still works in the new theme ---
  const before = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  await page.getByRole('button', { name: /^Log / }).first().click()
  await page.waitForTimeout(400)
  const toast = await page.getByRole('status').innerText()
  check('space-flavored toast', /cr$/.test(toast), `("${toast}")`)
  const after = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('log recorded', before !== after)

  // --- area view in space ---
  await page.goto(`${URL}/#chickens`, { waitUntil: 'networkidle' })
  check('area opens in starship', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Chickens')
  check('back label renamed', (await page.getByRole('button', { name: 'All decks' }).count()) === 1)
  check('starfield on area view', (await page.locator('.star-layer').count()) === 3)

  // --- switch back ---
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Change look' }).first().click()
  await page.waitForTimeout(250)
  await page.getByRole('dialog').getByRole('button', { name: /Homestead/ }).click()
  await page.waitForTimeout(500)
  check('switched back to Homestead', await page.evaluate(() => document.documentElement.dataset.theme) === 'home')
  check('starfield removed', (await page.locator('.star-layer').count()) === 0)
  check('copy reverted', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')
  const bgBack = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  check('body back to light', bgBack === 'rgb(241, 245, 249)', bgBack)
  check('history survived the theme change', (await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))) === after)

  // --- picker can be dismissed without changing anything ---
  await page.getByRole('button', { name: 'Change look' }).first().click()
  await page.waitForTimeout(250)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  check('Escape closes the picker', (await page.getByRole('dialog').count()) === 0)
  check('theme unchanged after dismiss', await page.evaluate(() => document.documentElement.dataset.theme) === 'home')

  // --- no overflow in either theme ---
  for (const themeId of ['home', 'starship']) {
    await page.evaluate((id) => { localStorage.setItem('home-maintenance-dashboard/theme', id) }, themeId)
    await page.reload({ waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`no horizontal overflow (${themeId})`, overflow <= 0, `${overflow}px`)
  }

  // --- reduced motion is respected ---
  const rmContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const rmPage = await rmContext.newPage()
  await rmPage.goto(URL, { waitUntil: 'networkidle' })
  const animationState = await rmPage.evaluate(() => {
    const layer = document.querySelector('.star-layer')
    return layer ? getComputedStyle(layer).animationName : 'none'
  })
  check('star drift disabled under reduced motion', animationState === 'none', animationState)
  await rmContext.close()

  check('no console/page errors', errors.length === 0, errors.join(' | '))

}
