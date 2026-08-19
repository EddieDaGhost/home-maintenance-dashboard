/**
 * Pixels, without a canvas. Pure.
 *
 * The summed-area table in here is the single reason the detail slider is free. Instead
 * of averaging N source pixels per cell — which gets slower as the chart gets coarser,
 * exactly backwards from what you want — a prefix sum is built once per image and then
 * every cell average is four lookups per channel, whatever size the cell is.
 *
 * Building a chart therefore costs O(stitches x rows), roughly ten thousand lookups,
 * rather than O(source pixels). Dragging from 50px blocks to 5px blocks multiplies the
 * cell count by a hundred, and a hundred times thirty microseconds is still nothing.
 */

import { linearToSrgb, srgbToLinear } from './color.js'

/** @typedef {{width:number, height:number, data:Uint8ClampedArray}} Raster */

/**
 * @param {Raster} raster
 * @returns {{w:number, h:number, sum:Float64Array, alpha:Float64Array}}
 *
 * Sums are in LINEAR light, not sRGB bytes — see `srgbToLinear`. They are also
 * premultiplied by alpha, with the alpha carried in its own plane, so a transparent
 * background doesn't drag every edge cell toward black.
 *
 * Float64, not Uint32: a 1024x1024 image summing 16-bit-ish linear values reaches about
 * 6.5e10, which overflows a uint32 and silently corrupts the bottom-right quadrant of
 * every table. That bug is invisible until someone charts a large photo.
 */
export function buildSat(raster) {
  const { width: w, height: h, data } = raster
  const rowStride = (w + 1) * 3
  const sum = new Float64Array((w + 1) * (h + 1) * 3)
  const alpha = new Float64Array((w + 1) * (h + 1))

  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      const s = (y * (w + 1) + x) * 3
      const up = s - rowStride
      const left = s - 3
      const upLeft = up - 3
      const p = ((y - 1) * w + (x - 1)) * 4
      const a = data[p + 3] / 255

      sum[s] = srgbToLinear(data[p]) * a + sum[left] + sum[up] - sum[upLeft]
      sum[s + 1] = srgbToLinear(data[p + 1]) * a + sum[left + 1] + sum[up + 1] - sum[upLeft + 1]
      sum[s + 2] = srgbToLinear(data[p + 2]) * a + sum[left + 2] + sum[up + 2] - sum[upLeft + 2]

      const ai = y * (w + 1) + x
      alpha[ai] = a + alpha[ai - 1] + alpha[ai - (w + 1)] - alpha[ai - (w + 1) - 1]
    }
  }
  return { w, h, sum, alpha }
}

/**
 * Average colour of a normalised 0..1 rectangle of the source.
 *
 * @returns {{rgb:[number,number,number], coverage:number}} coverage is the mean alpha,
 * so a caller can treat a mostly-transparent cell as background rather than as a colour.
 */
export function boxAverage(sat, u0, v0, u1, v1) {
  const { w, h, sum, alpha } = sat
  // Snap to whole pixels. Round rather than floor/ceil so adjacent cells agree on the
  // boundary between them and no source pixel is counted twice or skipped.
  let x0 = Math.round(u0 * w)
  let x1 = Math.round(u1 * w)
  let y0 = Math.round(v0 * h)
  let y1 = Math.round(v1 * h)
  x0 = Math.min(Math.max(x0, 0), w)
  x1 = Math.min(Math.max(x1, 0), w)
  y0 = Math.min(Math.max(y0, 0), h)
  y1 = Math.min(Math.max(y1, 0), h)
  // A cell smaller than one source pixel still has to sample something.
  if (x1 <= x0) x1 = Math.min(w, x0 + 1)
  if (y1 <= y0) y1 = Math.min(h, y0 + 1)
  if (x1 <= x0 || y1 <= y0) return { rgb: [0, 0, 0], coverage: 0 }

  const a = (y1 * (w + 1) + x1) * 3
  const b = (y1 * (w + 1) + x0) * 3
  const c = (y0 * (w + 1) + x1) * 3
  const d = (y0 * (w + 1) + x0) * 3

  const area = (x1 - x0) * (y1 - y0)
  const cov =
    (alpha[y1 * (w + 1) + x1] -
      alpha[y1 * (w + 1) + x0] -
      alpha[y0 * (w + 1) + x1] +
      alpha[y0 * (w + 1) + x0]) /
    area

  if (cov <= 0) return { rgb: [0, 0, 0], coverage: 0 }

  // Divide by the alpha weight, not the area — un-premultiplying, so a half
  // transparent cell reports the colour that IS there rather than a darkened version.
  const weight = cov * area
  return {
    rgb: [
      linearToSrgb((sum[a] - sum[b] - sum[c] + sum[d]) / weight),
      linearToSrgb((sum[a + 1] - sum[b + 1] - sum[c + 1] + sum[d + 1]) / weight),
      linearToSrgb((sum[a + 2] - sum[b + 2] - sum[c + 2] + sum[d + 2]) / weight),
    ],
    coverage: cov,
  }
}

/**
 * Single pixel at the centre of a cell.
 *
 * For flat art — a logo, a cartoon, existing pixel art — averaging across a hard edge
 * invents a halfway colour that then matches to a third yarn, so a two-colour logo
 * charts with five colours and a fringe. Nearest sampling keeps edges hard.
 */
export function nearestSample(raster, u, v) {
  const { width: w, height: h, data } = raster
  const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)))
  const y = Math.min(h - 1, Math.max(0, Math.floor(v * h)))
  const p = (y * w + x) * 4
  return { rgb: [data[p], data[p + 1], data[p + 2]], coverage: data[p + 3] / 255 }
}

/**
 * Rough count of distinct colours, capped so it stays cheap. Used to notice that an
 * upload is flat art and suggest the sampling mode that suits it.
 */
export function countDistinctColors(raster, cap = 64) {
  const seen = new Set()
  const { data } = raster
  const step = Math.max(4, Math.floor(data.length / 4 / 4096) * 4)
  for (let p = 0; p < data.length; p += step) {
    if (data[p + 3] < 128) continue
    seen.add((data[p] >> 3) * 1024 + (data[p + 1] >> 3) * 32 + (data[p + 2] >> 3))
    if (seen.size > cap) return cap + 1
  }
  return seen.size
}

/** Brightness / contrast / saturation, applied per CELL rather than per pixel. */
export function applyAdjust([r, g, b], adjust) {
  if (!adjust) return [r, g, b]
  const { brightness = 0, contrast = 0, saturation = 0 } = adjust
  if (!brightness && !contrast && !saturation) return [r, g, b]

  const clamp8 = (v) => Math.min(255, Math.max(0, v))
  const bAdd = brightness * 255
  const cMul = (100 + contrast * 100) / 100

  let out = [r, g, b].map((v) => clamp8((v - 128) * cMul + 128 + bAdd))
  if (saturation) {
    const grey = 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]
    const s = 1 + saturation
    out = out.map((v) => clamp8(grey + (v - grey) * s))
  }
  return [Math.round(out[0]), Math.round(out[1]), Math.round(out[2])]
}
