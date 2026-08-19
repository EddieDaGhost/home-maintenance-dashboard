/**
 * Synthetic rasters, so the pure suites never need an image file on disk.
 * Every builder returns the same shape `loadSource` produces: {width, height, data}.
 */

import { buildSat } from '../src/lib/raster.js'
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/lib/settings.js'

export function raster(width, height, fn) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = fn(x, y)
      const p = (y * width + x) * 4
      data[p] = r
      data[p + 1] = g
      data[p + 2] = b
      data[p + 3] = a
    }
  }
  return { width, height, data }
}

export const solid = (w, h, rgb) => raster(w, h, () => rgb)

/** Left half one colour, right half another. Seam is exact. */
export const halves = (w, h, left, right) => raster(w, h, (x) => (x < w / 2 ? left : right))

export const gradient = (w, h) => raster(w, h, (x) => {
  const v = Math.round((x / Math.max(1, w - 1)) * 255)
  return [v, v, v]
})

/** A filled circle — the shape that proves gauge correction works. */
export const circle = (w, h, inside, outside) =>
  raster(w, h, (x, y) => {
    const dx = (x + 0.5) / w - 0.5
    const dy = (y + 0.5) / h - 0.5
    return Math.hypot(dx, dy) < 0.35 ? inside : outside
  })

export const checker = (w, h, size, a, b) =>
  raster(w, h, (x, y) => ((Math.floor(x / size) + Math.floor(y / size)) % 2 ? a : b))

/** Opaque shape on a fully transparent background. */
export const transparentLogo = (w, h, rgb) =>
  raster(w, h, (x, y) => {
    const inShape = x > w * 0.25 && x < w * 0.75 && y > h * 0.25 && y < h * 0.75
    return inShape ? [...rgb, 255] : [0, 0, 0, 0]
  })

/** A raster plus its summed-area table, which is what buildChart actually wants. */
export function source(r) {
  return { raster: r, sat: buildSat(r), aspect: r.width / r.height, width: r.width }
}

export function settings(overrides = {}) {
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...overrides })
}
