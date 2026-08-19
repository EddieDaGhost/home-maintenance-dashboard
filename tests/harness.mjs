/**
 * Browser discovery and the entire assertion library.
 *
 * No browser is downloaded at install time. The harness finds Chrome where it already
 * lives — CHROME_PATH, then a Playwright browsers directory, then the usual install
 * locations for each platform.
 */

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const BASE_URL = process.env.TEST_URL ?? 'http://127.0.0.1:4173'

const CHROME_LOCATIONS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (browsersPath && existsSync(browsersPath)) {
    // Playwright lays these out as chromium-<build>/chrome-linux/chrome and friends.
    const candidates = []
    for (const entry of readdirSync(browsersPath)) {
      if (!entry.startsWith('chromium')) continue
      candidates.push(
        join(browsersPath, entry, 'chrome-linux', 'chrome'),
        join(browsersPath, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        join(browsersPath, entry, 'chrome-win', 'chrome.exe'),
        join(browsersPath, entry),
      )
    }
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate
    }
  }

  for (const location of CHROME_LOCATIONS) if (existsSync(location)) return location
  throw new Error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.')
}

/**
 * playwright-core is imported lazily on purpose: the pure suites must run with nothing
 * but Node, so `npm run check -- gauge` works in a bare checkout.
 */
export async function launchBrowser() {
  const { chromium } = await import('playwright-core')
  return chromium.launch({ executablePath: findChrome() })
}

/** The assertion library, in full. */
export function createChecker(suiteName) {
  const results = []
  const check = (name, ok, extra = '') => {
    results.push({ name, ok: Boolean(ok), extra })
    console.log(`  ${ok ? '✓' : '✗'} ${name}${extra ? `  ${extra}` : ''}`)
  }
  check.results = results
  check.suite = suiteName
  /** Compare and report what was actually seen when it doesn't match. */
  check.is = (name, actual, expected) => {
    const ok = actual === expected
    check(name, ok, ok ? '' : `got ${format(actual)}, expected ${format(expected)}`)
  }
  /** For floats. */
  check.near = (name, actual, expected, tolerance = 1e-6) => {
    const ok = Math.abs(actual - expected) <= tolerance
    check(name, ok, ok ? '' : `got ${actual}, expected ${expected} +/- ${tolerance}`)
  }
  return check
}

function format(v) {
  if (typeof v === 'string') return JSON.stringify(v)
  return String(v)
}

/**
 * A tablet-sized page. The target device is an iPad propped up on a craft table, which
 * is the whole reason the layout has to work at this width.
 */
export async function newTabletPage(browser, { clipboard = false, viewport } = {}) {
  const context = await browser.newContext({
    viewport: viewport ?? { width: 834, height: 1112 },
    deviceScaleFactor: 2,
    permissions: clipboard ? ['clipboard-read', 'clipboard-write'] : [],
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return { context, page, errors }
}
