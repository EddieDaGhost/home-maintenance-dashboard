/**
 * Gauge — the reason this tool exists.
 *
 * A crochet stitch is not square. Worked in single crochet a row is shorter than a
 * stitch is wide; worked in double crochet a row is much TALLER than a stitch is wide.
 * A chart drawn on square graph paper and then crocheted comes out the wrong shape,
 * and every circle in it comes out an oval.
 *
 * Gauge is always quoted per 4 inches (the standard swatch), so that's how it's stored.
 */

/**
 * Typical gauges for worsted-weight yarn on the hook size the ball band suggests.
 * They are starting points, not truth — everybody's tension differs, which is exactly
 * why the numbers are editable and why the PDF prints the gauge it assumed.
 */
export const STITCH_PRESETS = [
  { id: 'sc', label: 'Single crochet', stitchesPer4: 16, rowsPer4: 18 },
  { id: 'hdc', label: 'Half double crochet', stitchesPer4: 14, rowsPer4: 12 },
  { id: 'dc', label: 'Double crochet', stitchesPer4: 12, rowsPer4: 7 },
  { id: 'c2c', label: 'Corner to corner', stitchesPer4: 12, rowsPer4: 12 },
]

export const DEFAULT_GAUGE = { stitchesPer4: 16, rowsPer4: 18, unit: 'in' }

/** Guard rails. 250 stitches of worsted single crochet is already about 5 feet wide. */
export const MIN_STITCHES = 2
export const MAX_STITCHES = 250
export const MAX_ROWS = 400

/** Gauge inputs people can plausibly mean. Outside this it's a typo, not a swatch. */
export const MIN_PER_4 = 4
export const MAX_PER_4 = 60

export const CM_PER_INCH = 2.54
