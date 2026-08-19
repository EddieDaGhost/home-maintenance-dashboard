/**
 * Geometry. No colours, no pixels — just where every cell comes from.
 */

import {
  cellRectToSource,
  computeLayout,
  detailWasClamped,
  inBorder,
  inImage,
  stitchesForDetail,
} from '../src/lib/layout.js'
import { settings } from './fixtures.mjs'

const SC = { stitchesPer4: 16, rowsPer4: 18, unit: 'in' }
const DC = { stitchesPer4: 12, rowsPer4: 7, unit: 'in' }

export default async function run({ check }) {
  // --- the detail slider
  check.is('800px wide at 16px blocks is 50 stitches', stitchesForDetail(16, 800), 50)
  check.is('the same picture at 8px blocks is 100 stitches', stitchesForDetail(8, 800), 100)
  check.is('a huge picture is clamped, not obeyed', stitchesForDetail(5, 4000), 250)
  check('and the clamp is reported so the UI can say so', detailWasClamped(5, 4000))
  check('a normal request is not reported as clamped', !detailWasClamped(16, 800))
  check('never fewer than 2 stitches', stitchesForDetail(50, 10) >= 2)

  // --- no border, no target: the chart IS the picture
  const plain = computeLayout(settings({ gauge: SC, detailPx: 16 }), 1.0, 800)
  check.is('plain layout width', plain.stitches, 50)
  check.is('plain layout height comes from gauge, not pixels', plain.rows, 56)
  check.is('the picture starts at the origin', `${plain.image.x},${plain.image.y}`, '0,0')
  check.is('the picture fills the chart', `${plain.image.w},${plain.image.h}`, '50,56')
  check('nothing is padded', !plain.padded)

  // The same picture in double crochet is a completely different chart.
  const dc = computeLayout(settings({ gauge: DC, detailPx: 16 }), 1.0, 800)
  check.is('the same picture in double crochet', dc.rows, 29)
  check('double crochet needs far fewer rows for the same picture', dc.rows < plain.rows)

  // --- border
  const bordered = computeLayout(settings({ gauge: SC, detailPx: 16, border: { inches: 2, colorId: 'cream' } }), 1.0, 800)
  check.is('a 2 inch border is 8 stitches per side', bordered.border.sts, 8)
  check.is('a 2 inch border is 9 rows per side', bordered.border.rows, 9)
  check.is('the border widens the chart by both sides', bordered.stitches, 50 + 16)
  check.is('the border heightens the chart by both sides', bordered.rows, 56 + 18)
  check.is('the picture keeps its own size', `${bordered.image.w},${bordered.image.h}`, '50,56')
  check.is('the picture is inset by the border', `${bordered.image.x},${bordered.image.y}`, '8,9')
  check('the border band is border', inBorder(bordered, 0, 0))
  check('the middle is not border', !inBorder(bordered, 33, 37))
  check('the middle is in the picture', inImage(bordered, 33, 37))

  // --- target + contain
  const contain = computeLayout(
    settings({ gauge: SC, detailPx: 16, target: { stitches: 100, rows: 100 }, fit: 'contain' }),
    2.0,
    800,
  )
  check.is('a target sets the chart size exactly', `${contain.stitches},${contain.rows}`, '100,100')
  check.is('a wide picture fills the width', contain.image.w, 100)
  check.is('and takes the rows its shape needs', contain.image.h, 56)
  check('the leftover is padding', contain.padded)
  check.is('padding is centred', contain.image.x, 0)
  // The odd leftover cell always goes to the bottom. An unspecified tie-break makes
  // this suite flap depending on rounding.
  check.is('the odd leftover row goes to the bottom', contain.image.y, Math.floor((100 - 56) / 2))

  // A picture taller than the target flips to height-constrained.
  const tall = computeLayout(
    settings({ gauge: SC, detailPx: 16, target: { stitches: 100, rows: 40 }, fit: 'contain' }),
    0.5,
    800,
  )
  check('a tall picture is limited by rows, not stitches', tall.image.h <= 40 && tall.image.w < 100)
  check('and is padded left and right instead', tall.image.x > 0)

  // --- target + stretch
  const stretch = computeLayout(
    settings({ gauge: SC, detailPx: 16, target: { stitches: 100, rows: 100 }, fit: 'stretch' }),
    2.0,
    800,
  )
  check.is('stretch fills the grid exactly', `${stretch.image.w},${stretch.image.h}`, '100,100')
  check('stretch pads nothing', !stretch.padded)
  check('stretch says so', stretch.stretched)

  // --- cells tile the source with no gap and no overlap
  const layout = computeLayout(settings({ gauge: SC, detailPx: 20 }), 1.3, 640)
  let seamsAlign = true
  for (let y = layout.image.y; y < layout.image.y + layout.image.h; y++) {
    for (let x = layout.image.x; x < layout.image.x + layout.image.w - 1; x++) {
      const here = cellRectToSource(layout, x, y)
      const next = cellRectToSource(layout, x + 1, y)
      if (Math.abs(here.u1 - next.u0) > 1e-12) seamsAlign = false
    }
  }
  check('horizontal cell seams line up exactly', seamsAlign)

  let vSeamsAlign = true
  for (let y = layout.image.y; y < layout.image.y + layout.image.h - 1; y++) {
    const here = cellRectToSource(layout, layout.image.x, y)
    const below = cellRectToSource(layout, layout.image.x, y + 1)
    if (Math.abs(here.v1 - below.v0) > 1e-12) vSeamsAlign = false
  }
  check('vertical cell seams line up exactly', vSeamsAlign)

  const first = cellRectToSource(layout, layout.image.x, layout.image.y)
  const last = cellRectToSource(
    layout,
    layout.image.x + layout.image.w - 1,
    layout.image.y + layout.image.h - 1,
  )
  check.near('the first cell starts at the left edge of the source', first.u0, 0, 1e-12)
  check.near('the last cell ends at the right edge of the source', last.u1, 1, 1e-12)
  check.near('the first cell starts at the top of the source', first.v0, 0, 1e-12)
  check.near('the last cell ends at the bottom of the source', last.v1, 1, 1e-12)
}
