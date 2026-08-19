/**
 * The numbers that decide whether this is a project someone will actually start.
 */

import { formatSize } from '../lib/gauge.js'

export default function Summary({ dim, joins, unit }) {
  if (!dim) return null
  return (
    <dl
      className="panel numeral flex flex-wrap items-stretch gap-x-6 gap-y-3 px-4 py-3"
      aria-label="Chart summary"
    >
      <Stat label="Chart" value={`${dim.stitches} × ${dim.rows}`} note="stitches × rows" />
      <Stat label="Finished" value={formatSize(dim, unit)} note="at your gauge" />
      <Stat label="Colours" value={dim.colours} note="to buy" />
      {/*
        Joins sit next to the colour count on purpose. Twelve colours with nine hundred
        colour changes is far more work than twenty with two hundred, and without this
        number the "fewer colours" slider optimises the wrong thing.
      */}
      <Stat label="Colour changes" value={joins} note="ends to weave in" />
    </dl>
  )
}

function Stat({ label, value, note }) {
  return (
    <div className="min-w-[5.5rem]">
      <dt className="label">{label}</dt>
      <dd className="text-base font-semibold leading-tight">{value}</dd>
      <dd className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
        {note}
      </dd>
    </div>
  )
}
