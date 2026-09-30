#!/usr/bin/env node
// Regenerates the home-screen icons in public/ from one definition.
//
//     node scripts/make-icons.mjs
//
// ---------------------------------------------------------------------------
// Why there are PNGs in a repo whose rule is "inline SVG, never image files"
//
// That rule is about the credits scenes, and the reasons behind it are that the
// art is parameterised and that nothing on the tap-a-tag path may wait on a
// download. Neither applies here. A home-screen icon is not parameterised, it
// is never on the logging path, and — the part that forces the issue — **iOS
// does not accept an SVG for Add to Home Screen**. Given only `icon.svg`, iOS
// puts a *screenshot of the page* on the home screen, which for an app whose
// entire pitch is "add it to your home screen and tap the stickers" is the
// first thing anybody sees and the worst thing to get wrong.
//
// So: one glyph, written once below, rasterised into the sizes each platform
// actually reads. They are precached by the service worker like everything
// else (see `globPatterns` in vite.config.js), so they work offline too.
//
// Chromium does the rasterising, through the copy playwright-core already
// uses for the test suite. No new dependency, and no binary checked in that
// cannot be rebuilt from this file.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { findBrowser } from '../tests/harness.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

const INK = '#0f172a'
const MARK = '#f8fafc'

/**
 * The house with a tick in it. Drawn at 512 and scaled by the viewBox, so one
 * definition covers every size. It sits comfortably inside the middle 80% of
 * the canvas, which is what a maskable icon needs: Android crops to a circle
 * or a squircle depending on the launcher, and anything outside that is gone.
 */
const GLYPH = `
  <g transform="translate(256 264)" fill="none" stroke="${MARK}" stroke-width="26"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M-108 -18 L0 -114 L108 -18"/>
    <path d="M-82 -40 V96 H82 V-40"/>
    <path d="M-34 34 L-8 60 L44 4"/>
  </g>`

/** @param radius corner radius at 512; 0 means full-bleed square. */
const svg = (radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
  `<rect width="512" height="512"${radius ? ` rx="${radius}"` : ''} fill="${INK}"/>` +
  `${GLYPH}</svg>`

const ICONS = [
  // iOS ignores the manifest for Add to Home Screen and reads this one link.
  // It applies its own rounded mask, so ours must be a full-bleed square or
  // the corners get rounded twice and show a notch of whatever is behind.
  { file: 'apple-touch-icon.png', size: 180, radius: 0 },
  // Android and desktop Chrome, `purpose: "any"` — shown as drawn, so it keeps
  // its own corners.
  { file: 'icon-192.png', size: 192, radius: 112 },
  { file: 'icon-512.png', size: 512, radius: 112 },
  // `purpose: "maskable"`, which is cropped. Full-bleed, glyph in the safe zone.
  { file: 'icon-maskable-512.png', size: 512, radius: 0 },
]

const executablePath = findBrowser()
if (!executablePath) {
  console.error('No Chrome or Chromium found. Set CHROME_PATH to one and try again.')
  process.exit(1)
}

mkdirSync(PUBLIC, { recursive: true })
const browser = await chromium.launch({ executablePath })

try {
  for (const { file, size, radius } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(radius)}`,
    )
    writeFileSync(join(PUBLIC, file), await page.screenshot())
    await page.close()
    console.log(`  public/${file}  ${size}x${size}`)
  }
  // The SVG stays too: browsers that take it get the sharp one at any size.
  writeFileSync(join(PUBLIC, 'icon.svg'), `${svg(112)}\n`)
  console.log('  public/icon.svg  vector')
} finally {
  await browser.close()
}
