/**
 * Drawing, without a canvas of its own. Pure.
 *
 * These functions take any object with the handful of 2D-context methods they use, so
 * the real preview canvas, the PNG export canvas and a twenty-line recording stub in
 * the test suite all drive the identical code. That's what lets `tests/draw.mjs` assert
 * "the cells tile with no gap and no overlap" in bare Node.
 */

import { rgbToHex } from './color.js'

/**
 * Integer boundaries for `count` cells across `sizePx` pixels.
 *
 * Cells must not be drawn at fractional positions — you get seams of background colour
 * between them, or a doubled row of pixels, depending on which way the rounding lands.
 * Returning the edges instead of a width means every cell butts exactly against its
 * neighbour and the last one lands exactly on `sizePx`.
 */
export function cellEdges(count, sizePx) {
  const edges = new Int32Array(count + 1)
  for (let i = 0; i <= count; i++) edges[i] = Math.round((i * sizePx) / count)
  // A zero-width cell would make a stitch invisible. At small sizes, force at least 1px.
  for (let i = 1; i <= count; i++) if (edges[i] <= edges[i - 1]) edges[i] = edges[i - 1] + 1
  return edges
}

/**
 * Fill every cell of the chart.
 *
 * One `fillRect` per horizontal RUN rather than per cell, and `fillStyle` set only when
 * the colour changes. On a photo chart runs average three to eight cells, so this is
 * several times less work than the obvious loop — and it's the same run structure the
 * PDF uses, so the two exports can't drift apart.
 */
export function drawChart(ctx, chart, { width, height, originX = 0, originY = 0 }) {
  const xs = cellEdges(chart.stitches, width)
  const ys = cellEdges(chart.rows, height)
  let currentFill = null

  for (let y = 0; y < chart.rows; y++) {
    const top = originY + ys[y]
    const bottom = originY + ys[y + 1]
    let x = 0
    while (x < chart.stitches) {
      const index = chart.cells[y * chart.stitches + x]
      let end = x + 1
      while (end < chart.stitches && chart.cells[y * chart.stitches + end] === index) end++

      const hex = chart.palette[index] ? rgbToHex(chart.palette[index].rgb) : '#000000'
      if (hex !== currentFill) {
        ctx.fillStyle = hex
        currentFill = hex
      }
      ctx.fillRect(originX + xs[x], top, xs[end] - xs[x], bottom - top)
      x = end
    }
  }
}

/**
 * The counting grid.
 *
 * Every cell gets a hairline; every tenth gets a heavier one. The tens are the whole
 * point — nobody counts sixty individual squares, they count six blocks of ten, the
 * same way cross-stitch charts have always worked.
 */
export function drawGrid(
  ctx,
  chart,
  { width, height, originX = 0, originY = 0, boldEvery = 10, line = '#00000022', bold = '#00000055', lineWidth = 1 },
) {
  const xs = cellEdges(chart.stitches, width)
  const ys = cellEdges(chart.rows, height)

  /**
   * Below about six pixels a cell, a line on every boundary stops being a counting aid
   * and becomes a grey veil over the picture — you can no longer see the design you are
   * supposed to be judging. Zoomed out, only the tens are drawn; they're the ones you
   * actually count by anyway.
   */
  const cellW = width / chart.stitches
  const cellH = height / chart.rows
  const showEveryCell = Math.min(cellW, cellH) >= 6

  const stroke = (colour, w, segments) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = w
    ctx.beginPath()
    for (const [x1, y1, x2, y2] of segments) {
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
  }

  const thin = []
  const heavy = []
  for (let i = 0; i <= chart.stitches; i++) {
    // +0.5 keeps a 1px line on a pixel centre instead of straddling two.
    const x = originX + xs[i] + 0.5
    const seg = [x, originY, x, originY + height]
    ;(i % boldEvery === 0 || i === chart.stitches ? heavy : thin).push(seg)
  }
  for (let i = 0; i <= chart.rows; i++) {
    const y = originY + ys[i] + 0.5
    const seg = [originX, y, originX + width, y]
    // Bold lines are counted from the BOTTOM, because row 1 is the bottom row.
    const fromBottom = chart.rows - i
    ;(fromBottom % boldEvery === 0 || i === 0 || i === chart.rows ? heavy : thin).push(seg)
  }

  if (thin.length && showEveryCell) stroke(line, lineWidth, thin)
  if (heavy.length) stroke(bold, lineWidth * 2, heavy)
}

/** Cell height that keeps the drawing at true finished proportions for a given width. */
export function cellHeightFor(cellWidth, gauge) {
  return (cellWidth * gauge.stitchesPer4) / gauge.rowsPer4
}

/** Pixel size of a chart drawn at `cellWidth`, at true gauge proportions. */
export function chartPixelSize(chart, cellWidth) {
  const cellHeight = cellHeightFor(cellWidth, chart.gauge)
  return {
    width: Math.max(1, Math.round(chart.stitches * cellWidth)),
    height: Math.max(1, Math.round(chart.rows * cellHeight)),
    cellWidth,
    cellHeight,
  }
}
