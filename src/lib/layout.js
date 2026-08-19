/**
 * Geometry: settings + the source picture's proportions -> where every cell comes from.
 *
 * This module never sees a colour and never touches a pixel. That's deliberate — the
 * gauge arithmetic is the part most likely to be wrong and the part easiest to get
 * wrong silently, so it gets a suite that can prove "a 2:1 photo in double crochet is
 * N rows" without constructing a single image.
 *
 * Order of operations is load-bearing. Four things want to change the grid and they
 * compose in exactly one order:
 *
 *   A. how many stitches across   (the detail slider, horizontal only)
 *   B. how many rows              (from gauge, never from the image's pixel height)
 *   C. the border                 (added AROUND the picture, never scaling it)
 *   D. the target grid            (padding or stretching to a size the user typed)
 */

import { MAX_ROWS, MAX_STITCHES, MIN_STITCHES } from '../config/gauge.js'
import { inchesToRows, inchesToStitches, rowsForAspect, stitchesForRows } from './gauge.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * The detail slider maps source pixels per block to a stitch count.
 *
 * The slider is spec'd in pixels and labelled "Detail", but the number that matters to
 * the user is the stitch count underneath it — nobody planning a blanket thinks in
 * source pixels. Clamped hard: 5px blocks on a 4000px photo would be 800 stitches,
 * which at worsted gauge is a sixteen foot blanket.
 */
export function stitchesForDetail(detailPx, sourceWidthPx) {
  const raw = Math.round(sourceWidthPx / Math.max(1, detailPx))
  return clamp(raw, MIN_STITCHES, MAX_STITCHES)
}

/** True when the requested detail was clipped, so the UI can say so out loud. */
export function detailWasClamped(detailPx, sourceWidthPx) {
  return Math.round(sourceWidthPx / Math.max(1, detailPx)) > MAX_STITCHES
}

/**
 * @typedef {{
 *   stitches: number, rows: number,
 *   border: { sts: number, rows: number },
 *   image:  { x: number, y: number, w: number, h: number },
 *   stretched: boolean, padded: boolean, clamped: boolean,
 * }} Layout
 */

/** @returns {Layout} */
export function computeLayout(settings, sourceAspect, sourceWidthPx) {
  const gauge = settings.gauge
  const aspect = sourceAspect > 0 ? sourceAspect : 1

  // A + B. The picture's own size, in cells.
  let imageW = stitchesForDetail(settings.detailPx, sourceWidthPx)
  let imageH = clamp(rowsForAspect(imageW, aspect, gauge), 1, MAX_ROWS)

  // C. The border, per axis, from a distance rather than a cell count.
  const border = {
    sts: settings.border.inches > 0 ? inchesToStitches(settings.border.inches, gauge) : 0,
    rows: settings.border.inches > 0 ? inchesToRows(settings.border.inches, gauge) : 0,
  }

  let stitches = imageW + border.sts * 2
  let rows = imageH + border.rows * 2
  let imageX = border.sts
  let imageY = border.rows
  let stretched = false
  let padded = false

  // D. A target the user typed, e.g. "make it exactly 100 stitches for a cot blanket".
  const target = settings.target
  if (target && target.stitches > 0 && target.rows > 0) {
    stitches = clamp(Math.round(target.stitches), MIN_STITCHES, MAX_STITCHES)
    rows = clamp(Math.round(target.rows), 1, MAX_ROWS)

    const interiorW = Math.max(1, stitches - border.sts * 2)
    const interiorH = Math.max(1, rows - border.rows * 2)

    if (settings.fit === 'stretch') {
      // Fill the grid. The sampling rectangle distorts; the picture stretches with it.
      imageW = interiorW
      imageH = interiorH
      imageX = border.sts
      imageY = border.rows
      stretched = true
    } else {
      // Whole picture: fit inside the interior at gauge-correct proportions, centred.
      const wantRows = rowsForAspect(interiorW, aspect, gauge)
      if (wantRows <= interiorH) {
        imageW = interiorW
        imageH = Math.max(1, wantRows)
      } else {
        imageH = interiorH
        imageW = Math.max(1, Math.min(interiorW, stitchesForRows(interiorH, aspect, gauge)))
      }
      // The odd leftover cell always goes bottom and right. Stated here, asserted in
      // tests/layout.mjs — an unspecified tie-break makes the whole suite flap.
      imageX = border.sts + Math.floor((interiorW - imageW) / 2)
      imageY = border.rows + Math.floor((interiorH - imageH) / 2)
      padded = imageW !== interiorW || imageH !== interiorH
    }
  }

  return {
    stitches,
    rows,
    border,
    image: { x: imageX, y: imageY, w: imageW, h: imageH },
    stretched,
    padded,
    clamped: detailWasClamped(settings.detailPx, sourceWidthPx),
  }
}

/** True when (x, y) is in the border band rather than the interior. */
export function inBorder(layout, x, y) {
  const { border, stitches, rows } = layout
  return x < border.sts || y < border.rows || x >= stitches - border.sts || y >= rows - border.rows
}

/** True when (x, y) is inside the picture itself. */
export function inImage(layout, x, y) {
  const { image } = layout
  return x >= image.x && x < image.x + image.w && y >= image.y && y < image.y + image.h
}

/**
 * The patch of source picture one chart cell covers, in normalised 0..1 coordinates.
 *
 * Cells tile exactly: cell x's right edge is cell x+1's left edge, to the bit. Gaps
 * would drop source pixels; overlaps would double-count them. tests/layout.mjs walks
 * every cell of a chart and asserts the seams line up.
 */
export function cellRectToSource(layout, x, y) {
  const { image } = layout
  const u0 = (x - image.x) / image.w
  const u1 = (x - image.x + 1) / image.w
  const v0 = (y - image.y) / image.h
  const v1 = (y - image.y + 1) / image.h
  return { u0, v0, u1, v1 }
}
