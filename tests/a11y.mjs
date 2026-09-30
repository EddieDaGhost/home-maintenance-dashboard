// Keyboard and assistive-technology behaviour, plus the two files a phone
// reads before the app has run at all.
//
// Three things, each of which was broken and none of which any other suite can
// see — they all pass whether or not a mouse-free person can use the app:
//
//   1. A sheet that says `aria-modal="true"` actually behaves like one. Before
//      this, opening a sheet left focus on the button behind it and fifteen
//      presses of Tab walked the page underneath without once landing inside
//      the dialog.
//   2. Keyboard focus is visible. The only focus rule in the stylesheet was for
//      text fields, so tabbing to a Log button showed nothing.
//   3. The home-screen icons exist and are the right shape. iOS ignores the
//      manifest and will not take an SVG, so without apple-touch-icon.png it
//      puts a screenshot of the page on the home screen.

import { openSettings } from './harness.mjs'

/** Where focus is, and whether it is inside the open dialog. */
const focus = (page) =>
  page.evaluate(() => {
    const el = document.activeElement
    const dialog = document.querySelector('[role="dialog"]')
    return {
      label: (el?.getAttribute('aria-label') || el?.textContent || '').trim().slice(0, 40),
      inDialog: dialog ? dialog.contains(el) : false,
      isDialog: el === dialog,
    }
  })

export default async function run({ page, check, errors, URL }) {
  await page.goto(URL, { waitUntil: 'networkidle' })

  // ======================= 1. sheets are really modal =======================
  await page.getByRole('button', { name: 'Change look' }).first().click()
  await page.waitForTimeout(400)
  const picker = page.getByRole('dialog', { name: 'Choose a look' })
  check('the picker opened', await picker.isVisible())

  const opened = await focus(page)
  check('opening a sheet moves focus into it', opened.inDialog, JSON.stringify(opened))
  check('and lands on the dialog itself, not on a button it would pre-arm', opened.isDialog)

  // The load-bearing one: Tab must not be able to leave. Twenty presses is far
  // more than the sheet holds, so without a trap this walks the page behind.
  let escaped = null
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press('Tab')
    // eslint-disable-next-line no-await-in-loop
    const at = await focus(page)
    if (!at.inDialog) {
      escaped = `${i + 1} tabs: ${at.label}`
      break
    }
  }
  check('twenty tabs cannot get out of it', escaped === null, String(escaped))

  for (let i = 0; i < 6; i += 1) await page.keyboard.press('Shift+Tab')
  const back = await focus(page)
  check('and neither can shift-tab', back.inDialog, JSON.stringify(back))

  // Closing hands focus back to whatever opened it, rather than dropping it on
  // <body> where the next Tab starts again from the top of the page.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  check('escape closes it', (await page.getByRole('dialog').count()) === 0)
  const returned = await focus(page)
  check('closing gives focus back to what opened it', /look/i.test(returned.label), returned.label)

  // The backdrop used to be a full-screen <button aria-label="Close"> sitting
  // ahead of the dialog in the tab order — a trap of its own, and a second
  // "Close" for a screen reader to read out.
  await page.getByRole('button', { name: 'Change look' }).first().click()
  await page.waitForTimeout(400)
  const closers = await page.getByRole('button', { name: 'Close' }).count()
  check('there is exactly one Close control, not two', closers === 1, `${closers}`)
  // It still closes on a tap outside, which is how it is actually used.
  await page.mouse.click(10, 10)
  await page.waitForTimeout(400)
  check('tapping outside still closes it', (await page.getByRole('dialog').count()) === 0)

  // A second sheet, opened a different way, to prove this is the shared Sheet
  // and not something special about the theme picker.
  await openSettings(page)
  await page.getByRole('button', { name: /NFC tags/ }).click()
  await page.waitForTimeout(400)
  const tags = await focus(page)
  check('the tag sheet behaves the same way', tags.inDialog, JSON.stringify(tags))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ======================== 2. focus is visible ============================
  await page.goto(URL, { waitUntil: 'networkidle' })
  // Walk in from the top until a Log button has focus — that is the control
  // that matters and the one the ring was invisible on.
  let ring = null
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab')
    // eslint-disable-next-line no-await-in-loop
    ring = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || !/^Log /.test(el.getAttribute('aria-label') ?? '')) return null
      const s = getComputedStyle(el)
      return { width: s.outlineWidth, style: s.outlineStyle, color: s.outlineColor }
    })
    if (ring) break
  }
  check('tabbing reaches a Log button', ring !== null)
  check('which draws a real focus ring', ring !== null && parseFloat(ring.width) >= 2, JSON.stringify(ring))
  check('that is not the invisible browser default', ring !== null && ring.style === 'solid', JSON.stringify(ring))

  // :focus-visible, not :focus — otherwise every thumb tap on a phone leaves a
  // ring behind and the app looks broken. Note this cannot be tested by calling
  // .focus() and reading the style back: per spec a programmatic focus DOES
  // match :focus-visible when the last interaction was a keyboard one, which
  // after forty presses of Tab it was. What matters is the pointer case, and
  // the honest way to ask is whether anything on the page is wearing a ring.
  const button = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) => /^Log /.test(b.getAttribute('aria-label') ?? ''))
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.click(button.x, button.y)
  await page.waitForTimeout(300)
  const rings = await page.evaluate(() => document.querySelectorAll(':focus-visible').length)
  check('but a tap with a pointer leaves no ring anywhere', rings === 0, `${rings} ringed`)

  // ================== 3. the icons a phone reads first =====================
  const head = await page.evaluate(() => ({
    apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ?? null,
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? null,
  }))
  check('iOS is given an apple-touch-icon', head.apple === '/apple-touch-icon.png', String(head.apple))

  const icon = await page.request.get(`${URL}/apple-touch-icon.png`)
  check('and it is actually served', icon.status() === 200, `HTTP ${icon.status()}`)
  const bytes = await icon.body()
  check('as a real PNG', bytes.slice(1, 4).toString() === 'PNG', bytes.slice(0, 8).toString('hex'))
  // The IHDR width and height live at bytes 16-24 of any PNG.
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  check('at the 180x180 iOS asks for', width === 180 && height === 180, `${width}x${height}`)

  const manifest = await (await page.request.get(`${URL}/manifest.webmanifest`)).json()
  const purposes = manifest.icons.map((i) => i.purpose)
  check('the manifest offers a maskable icon', purposes.includes('maskable'))
  check('and a plain one', purposes.includes('any'))
  // The bug this replaces: one entry marked "any maskable" pointed at art with
  // rounded corners, so Android cropped the corners off a rounded shape.
  check(
    'no icon claims to be both, which would let a launcher crop rounded art',
    purposes.every((p) => p !== 'any maskable'),
    purposes.join(' | '),
  )
  check('there is a 512 for the splash screen', manifest.icons.some((i) => i.sizes === '512x512'))

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
