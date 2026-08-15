// Shared bits for the test suites.
//
// We depend on `playwright-core`, which never downloads a browser — that keeps
// `npm install` (and every Vercel build) fast. The browser is found on your
// machine instead, in this order:
//
//   1. $CHROME_PATH             — set this if the others don't work
//   2. $PLAYWRIGHT_BROWSERS_PATH/chromium
//   3. Google Chrome, wherever your OS keeps it
//
// So: if you have Chrome installed, `npm run check` just works.

import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

export const BASE_URL = process.env.TEST_URL ?? 'http://127.0.0.1:4173'

const CHROME_LOCATIONS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    const bundled = `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium`
    if (existsSync(bundled)) return bundled
  }
  return CHROME_LOCATIONS.find((path) => existsSync(path))
}

export async function launchBrowser() {
  const executablePath = findBrowser()
  if (!executablePath) {
    throw new Error(
      'No Chrome or Chromium found. Install Google Chrome, or point CHROME_PATH at a browser:\n' +
        '  CHROME_PATH="/path/to/chrome" npm run check',
    )
  }
  return chromium.launch({ executablePath })
}

/** Collects pass/fail results for one suite. */
export function createChecker(suiteName) {
  const results = []
  const check = (name, ok, extra = '') => {
    results.push({ name, ok: Boolean(ok), extra })
    const mark = ok ? '  \u2713' : '  \u2717'
    console.log(`${mark} ${name}${extra ? `  ${extra}` : ''}`)
  }
  check.results = results
  check.suiteName = suiteName
  return check
}

/**
 * An iPhone-sized page that records console errors for the suite to assert on.
 *
 * By default the device is pre-claimed, so suites land on the dashboard the way
 * an owner's phone does. Pass `virgin: true` to test what a visitor sees.
 */
export async function newPhonePage(browser, { virgin = false, ...options } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    ...options,
  })

  if (!virgin) {
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'home-maintenance-dashboard/device/v1',
          JSON.stringify({ claimed: true, claimedAt: 0 }),
        )
      } catch {
        // nothing to do
      }
    })
  }

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  // Suites that delete things confirm through window.confirm.
  page.on('dialog', (dialog) => dialog.accept())
  return { context, page, errors }
}
