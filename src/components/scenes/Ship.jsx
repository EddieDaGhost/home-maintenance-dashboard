import { SLOTS } from '../../config/catalog.js'
import { MOOD } from '../../lib/credits.js'
import { Blob, SceneDefs, Solid, shade, tintUp } from './parts.jsx'

// The Starship scene: your ship at its mooring, and whether the lights are on.
//
// Same inputs as the windowsill (see Windowsill.jsx) and the same rule: quiet
// means running dark on standby, never damaged. Nothing here is ever broken,
// scorched, leaking, or in need of repair.
//
// These are ships with timber, canvas and stonework on them rather than wedges
// of grey metal. That is a look, not a shortcut: every plank, sail and dome is
// still one path built out of `parts.jsx`, and every one of them takes its
// colour from the equipped finish. Hardcode a colour in a hull and the shop
// stops recolouring it — see the note on materials below.

const HULL_DEFAULT = '#7f93ad'

// Materials, as opposed to livery. Glass is glass and lamplight is lamplight
// whatever you painted the hull, so these three are allowed to be fixed. They
// are the ONLY fixed colours on any vessel: everything that is *the ship* is
// derived from `hull` with shade()/tintUp(), or the finish slot silently does
// nothing on the item you just spent 420 credits on.
const GLASS = '#bfe7ff'
const LEAF = '#e9cb8d'
const LAMP = '#ffe1a8'

function hullShade(color, mood) {
  return mood === MOOD.QUIET ? '#5d6b7e' : color
}

/** The whole palette of a ship, derived from one colour. */
function palette(hull) {
  return {
    hull,
    deck: shade(hull, 0.22),
    keel: shade(hull, 0.42),
    trim: shade(hull, 0.55),
    pale: tintUp(hull, 0.58),
    canvas: tintUp(hull, 0.76),
    cloth: tintUp(hull, 0.44),
  }
}

/**
 * Engines. A soft horizontal wash plus a flame, never a circle — a round glow
 * behind a triangle reads as a moon with something in front of it.
 */
function Engines({ x, spread }) {
  return (
    <g>
      <ellipse cx={x - 14} cy="0" rx="18" ry={spread} fill="url(#ship-burn)" />
      <path d={`M${x} ${-spread} L${x - 20} 0 L${x} ${spread} Z`} fill="url(#ship-burn)" />
    </g>
  )
}

/**
 * Portholes: a ring of hull-coloured trim with lit glass inside. Lights along
 * the spine were what the old hulls used; a row of windows says "there are
 * people in there", which is the whole difference between these and a wedge.
 */
function Portholes({ at, p, r = 2.4 }) {
  return (
    <g>
      {at.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={r + 1} fill={p.trim} />
          <circle cx={x} cy={y} r={r} fill={GLASS} opacity="0.9" />
          <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.4} fill="#ffffff" opacity="0.7" />
        </g>
      ))}
    </g>
  )
}

/**
 * Canvas, bellied out by the wind. A flat triangle reads as a paper dart, so
 * every sail is a curve — and it gets seams, because one unbroken shape at this
 * size looks like a sheet of card.
 */
function Sail({ d, seams = '', p }) {
  return (
    <g>
      <Solid d={d} fill={p.canvas} strokeWidth={0.8} />
      {seams ? <path d={seams} stroke={shade(p.canvas, 0.2)} strokeWidth="0.6" fill="none" opacity="0.6" /> : null}
    </g>
  )
}

/** Thin lines from the mast down to the hull. Without them a mast is a stick
    balanced on a roof. */
function Rigging({ d, p }) {
  return <path d={d} stroke={p.keel} strokeWidth="0.7" fill="none" opacity="0.8" strokeLinecap="round" />
}

/** A deck rail: the top line plus its stanchions, drawn in one go. */
function Rail({ from, to, y, p, posts = 5 }) {
  const step = (to - from) / (posts - 1)
  return (
    <g stroke={p.trim} strokeWidth="0.9" opacity="0.9" strokeLinecap="round">
      <path d={`M${from} ${y} L${to} ${y}`} />
      {Array.from({ length: posts }, (_, i) => (
        <path key={i} d={`M${from + i * step} ${y} v4.5`} />
      ))}
    </g>
  )
}

/** A dome on its drum, with a finial on top. The palace ship is made of these. */
function Dome({ cx, cy, rx, ry, p, finial = 0 }) {
  return (
    <g>
      <Solid d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Z`} fill={p.pale} strokeWidth={0.9} />
      <path d={`M${cx - rx - 1.5} ${cy} L${cx + rx + 1.5} ${cy}`} stroke={LEAF} strokeWidth="1.4" opacity="0.85" />
      {finial ? (
        <g>
          <path d={`M${cx} ${cy - ry} v${-finial}`} stroke={LEAF} strokeWidth="1.3" />
          <circle cx={cx} cy={cy - ry - finial} r="1.8" fill={LEAF} />
        </g>
      ) : null}
    </g>
  )
}

/**
 * A tapering ribbon built from a centreline, rather than from two hand-matched
 * curves. This exists because the first pass at the drifter's arms was a wedge
 * from body to point per arm, and six of those radiating from one place reads
 * as a sea urchin. Offsetting a curve that actually bends is what makes an arm
 * look like it is hanging rather than sticking out.
 */
function ribbon(points, width) {
  const left = []
  const right = []
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i]
    const [px, py] = points[Math.max(0, i - 1)]
    const [nx, ny] = points[Math.min(points.length - 1, i + 1)]
    const dx = nx - px
    const dy = ny - py
    const len = Math.hypot(dx, dy) || 1
    const half = (width * (1 - i / (points.length - 1)) ** 0.8) / 2
    left.push([x - (dy / len) * half, y + (dx / len) * half])
    right.push([x + (dy / len) * half, y - (dx / len) * half])
  }
  const run = (list) => list.map(([x, y], i) => `${i ? 'L' : ''}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return `M${run(left)} ${run(right.reverse())} Z`
}

/**
 * One arm's centreline: out at `angle`, curling by `curl` as it goes, with a
 * slow wave along it so no two are the same line at a different rotation.
 */
function armLine(angle, length, curl, phase, steps = 18) {
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    const a = ((angle + curl * t * t) * Math.PI) / 180
    const wob = Math.sin(t * Math.PI * 1.6 + phase) * 5 * t
    return [Math.cos(a) * t * length - Math.sin(a) * wob, Math.sin(a) * t * length + Math.cos(a) * wob]
  })
}

/** The starter ship, before anything has been requisitioned: a bare launch. */
function Shuttle({ p }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-34} spread={8} />
      <Solid d="M-34 -10 C-18 -16 6 -17 24 -9 C32 -6 32 4 24 8 C6 16 -18 15 -34 9 Z" fill={p.hull} />
      <Solid d="M-32 -9 C-16 -14 6 -15 22 -8 L22 -5 C6 -12 -16 -11 -32 -6 Z" fill={p.deck} strokeWidth={0.7} />
      <Portholes at={[[-18, 2], [-4, 3]]} p={p} r={2.2} />
      <Blob cx={14} cy={-2} rx={7} ry={4.6} fill={GLASS} outline={false} />
      <Solid d="M-32 -8 L-42 -20 L-26 -11 Z" fill={p.keel} strokeWidth={0.7} opacity={0.85} />
    </g>
  )
}

/**
 * The 50-credit first purchase: one seat, one sail, and an engine that has seen
 * some use. Deliberately the plainest hull in the slot — the cheap end has to
 * look cheap standing next to the palace ship.
 */
function PodRunner({ p }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-28} spread={6} />
      {/* Mast and its one sail, behind the hull so the deck overlaps the foot.
          The sail sits off the mast rather than on it, or the mast vanishes. */}
      <path d="M-4 -8 V-32" stroke={p.keel} strokeWidth="1.6" strokeLinecap="round" />
      <Sail d="M-1 -29 C11 -25 14 -15 5 -9 L-1 -9 Z" seams="M-1 -22 C5 -20 8 -16 9 -13" p={p} />
      <Solid d="M-28 -8 C-16 -13 2 -14 16 -8 C24 -5 24 4 16 7 C2 14 -16 13 -28 8 Z" fill={p.hull} />
      <Solid d="M-26 -7 C-14 -11 2 -12 14 -7 L14 -4.5 C2 -9.5 -14 -8.5 -26 -4.5 Z" fill={p.deck} strokeWidth={0.6} />
      <Portholes at={[[-14, 2]]} p={p} r={2.1} />
      <Blob cx={8} cy={-1} rx={6} ry={4} fill={GLASS} outline={false} />
      <Solid d="M-26 -6 L-36 -17 L-22 -9 Z" fill={p.keel} strokeWidth={0.7} opacity={0.85} />
    </g>
  )
}

/**
 * 80 credits: the sailing scout — a timber hull under canvas, with a jib, a
 * rudder fin and windows you can see the crew through.
 */
function Scout({ p }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-48} spread={9} />
      {/* Rudder, behind everything. */}
      <Solid d="M-44 -8 L-58 -24 L-38 -10 Z" fill={p.keel} strokeWidth={0.8} opacity={0.85} />
      {/* Mast, sails and rigging go down before the hull so the gunwale covers
          the foot of the mast — otherwise it reads as standing in front. */}
      <path d="M-6 -10 V-46" stroke={p.keel} strokeWidth="1.8" strokeLinecap="round" />
      <Rigging d="M-6 -45 L-40 -10 M-6 -45 L38 -6 M-6 -28 L-22 -10" p={p} />
      {/* Main aft, jib forward. They have to be different SHAPES, not just
          different shades: two bellied curves either side of the mast merge
          into one white mushroom and the ship reads as having a single sail. */}
      <Sail d="M-8 -44 C-27 -38 -32 -20 -23 -12 L-8 -12 Z" seams="M-8 -34 C-17 -31 -22 -25 -23 -19" p={p} />
      <Solid d="M-4 -43 C7 -34 17 -22 21 -12 L-3 -12 Z" fill={p.cloth} strokeWidth={0.8} />
      {/* Hull: flat deck, curved belly, prow lifting at the bow. */}
      <Solid
        d="M-46 -9 L28 -9 C42 -8 53 -4 60 3 C50 11 24 17 -6 17 C-24 17 -38 13 -46 7 Z"
        fill={p.hull}
      />
      {/* The gunwale — a painted band along the top of the planking. */}
      <Solid
        d="M-46 -12 L30 -12 C45 -11 56 -6 63 2 L59 3.5 C52 -3 42 -7 28 -8 L-46 -8 Z"
        fill={p.deck}
        strokeWidth={0.8}
      />
      <Portholes at={[[-34, 2], [-21, 4], [-8, 5], [5, 4]]} p={p} />
      <Blob cx={34} cy={0} rx={9} ry={5} fill={GLASS} outline={false} />
      {/* Bowsprit. */}
      <path d="M58 1 L74 -4" stroke={p.keel} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

/**
 * 180 credits: the freighter, which in this fleet is a working village that
 * flies — cabins with pitched roofs along the deck, a promenade rail, and an
 * observatory dome over the bow.
 */
function Freighter({ p }) {
  const cabin = (x, w, h) => (
    <g key={x}>
      <Solid d={`M${x} -13 L${x + w} -13 L${x + w} ${-13 - h} L${x} ${-13 - h} Z`} fill={p.pale} strokeWidth={0.8} />
      <Solid
        d={`M${x - 2.5} ${-13 - h} L${x + w + 2.5} ${-13 - h} L${x + w / 2} ${-19 - h} Z`}
        fill={p.deck}
        strokeWidth={0.8}
      />
      <rect x={x + w / 2 - 1.8} y={-11 - h} width="3.6" height="4" rx="1" fill={GLASS} opacity="0.85" />
    </g>
  )

  return (
    <g transform="translate(158 100)">
      <Engines x={-76} spread={13} />
      <Solid d="M-70 -10 L-88 -30 L-62 -12 Z" fill={p.keel} strokeWidth={0.8} opacity={0.85} />
      {/* One mast, stepped right at the stern. Anywhere further forward and the
          sail leans on a cabin roof and reads as fallen over. */}
      <path d="M-64 -15 V-56" stroke={p.keel} strokeWidth="1.8" strokeLinecap="round" />
      {/* The sail's foot clears the cabin roofs. Lower than this and it leans on
          the first one and the whole thing reads as a crane, not a mast. */}
      <Sail d="M-63 -54 C-46 -49 -43 -38 -54 -33 L-63 -33 Z" seams="M-63 -46 C-54 -43 -49 -39 -48 -35" p={p} />
      <Rigging d="M-64 -55 L-72 -16 M-64 -55 L-47 -32" p={p} />

      <Solid
        d="M-72 -12 L34 -12 C54 -10 70 -3 80 5 C64 17 28 24 -12 24 C-40 24 -60 19 -72 11 Z"
        fill={p.hull}
      />
      <Solid
        d="M-72 -15 L36 -15 C57 -13 73 -6 84 4 L80 6 C70 -3 54 -9 34 -11 L-72 -11 Z"
        fill={p.deck}
        strokeWidth={0.8}
      />
      {/* The promenade: the thing that says people walk about up there. */}
      <Rail from={-68} to={26} y={-17} p={p} posts={8} />
      {[cabin(-62, 20, 11), cabin(-36, 22, 13), cabin(-8, 18, 10)].map((node) => node)}
      {/* Observatory over the bow. */}
      <Dome cx={40} cy={-13} rx={14} ry={12} p={p} finial={5} />
      <path d="M28 -13 h24" stroke={p.trim} strokeWidth="2" />
      <Blob cx={40} cy={-15} rx={8} ry={6.5} fill={GLASS} outline={false} />
      <Portholes at={[[-58, 4], [-42, 6], [-26, 8], [-10, 9], [6, 9], [22, 7]]} p={p} />
      <Blob cx={56} cy={2} rx={10} ry={5.5} fill={GLASS} outline={false} />
    </g>
  )
}

/**
 * 320 credits: the palace ship. Domes, a colonnade, minarets and gold leaf on a
 * long sweeping hull. Detail scales with price — this one has to be obviously
 * more expensive than the freighter from across the room.
 */
function Cruiser({ p }) {
  // The colonnade. Filled with trim it reads as a row of headstones, so the
  // arches are lit windows with a pillar between each — an arcade you can see
  // people walking along, which is the whole point of putting one on a ship.
  const arch = (x) => (
    <g key={x}>
      <path
        d={`M${x} -6 L${x} -12 A3.2 4.2 0 0 1 ${x + 6.4} -12 L${x + 6.4} -6 Z`}
        fill={GLASS}
        opacity="0.85"
      />
      <path d={`M${x + 6.9} -6 v-6`} stroke={p.trim} strokeWidth="1.6" opacity="0.9" />
    </g>
  )
  const minaret = (x, h) => (
    <g key={x}>
      <Solid d={`M${x - 2.6} -14 L${x + 2.6} -14 L${x + 2} ${-14 - h} L${x - 2} ${-14 - h} Z`} fill={p.pale} strokeWidth={0.7} />
      <path d={`M${x - 3.4} ${-11 - h} h6.8`} stroke={LEAF} strokeWidth="1" opacity="0.9" />
      <Dome cx={x} cy={-14 - h} rx={3.6} ry={4.2} p={p} finial={4} />
    </g>
  )

  return (
    <g transform="translate(160 100)">
      {/* A wider burn than anything else in the slot — at 320 credits the
          difference should be visible without reading the label. */}
      <Engines x={-80} spread={15} />
      <Solid d="M-72 -8 L-92 -30 L-62 -11 Z" fill={p.keel} strokeWidth={0.8} opacity={0.8} />
      <Solid d="M-72 8 L-90 28 L-62 11 Z" fill={p.keel} strokeWidth={0.8} opacity={0.8} />

      {/* A pennant off the central finial. Drawn as a tapering shape rather than
          a stroke — an even-width stroke reads as a grey sausage in mid-air. */}
      <Solid
        d="M6 -59 C-12 -54 -30 -61 -52 -56 L-42 -52 L-52 -48 C-30 -45 -12 -44 6 -48 Z"
        fill={p.cloth}
        strokeWidth={0.7}
      />

      {minaret(-40, 18)}
      {minaret(50, 15)}
      <Dome cx={-16} cy={-16} rx={11} ry={10} p={p} finial={4} />
      <Dome cx={28} cy={-16} rx={10} ry={9} p={p} finial={4} />
      {/* The drum under the main dome, with its own windows. */}
      <Solid d="M-6 -16 L18 -16 L18 -30 L-6 -30 Z" fill={p.pale} strokeWidth={0.8} />
      <Dome cx={6} cy={-30} rx={16} ry={16} p={p} finial={10} />
      <Portholes at={[[0, -23], [12, -23]]} p={p} r={2} />

      <Solid
        d="M-76 -6 C-42 -14 0 -18 38 -16 C66 -14 88 -6 100 2 C78 13 34 20 -12 19 C-44 18 -66 11 -76 3 Z"
        fill={p.hull}
      />
      {/* The gold waterline, the single most expensive-looking line here. */}
      <path
        d="M-74 -7 C-40 -15 0 -19 38 -17 C66 -15 88 -7 99 1"
        stroke={LEAF}
        strokeWidth="1.6"
        fill="none"
        opacity="0.9"
      />
      <g>{[-52, -42, -32, -22, 34, 44, 54].map((x) => arch(x))}</g>
      <Portholes at={[[-58, 4], [-44, 6], [-30, 7], [-16, 8], [-2, 8], [12, 8], [26, 7], [40, 5]]} p={p} r={2.1} />
      {/* The prow canopy: one long window, not a bubble. */}
      <Solid d="M56 -4 C70 -3 84 1 92 4 C82 8 68 9 58 8 Z" fill={GLASS} strokeWidth={0.7} />
      <path d="M64 -3 v10 M74 -1 v9" stroke={p.trim} strokeWidth="0.9" opacity="0.7" />
    </g>
  )
}

/**
 * 220 credits: a shark, converted. Toothed prow, gill slits, a dorsal fin and
 * pectoral wings — the one hull in the slot that is looking back at you.
 */
function Hammerhead({ p }) {
  // Teeth hang from the mouth line, inside the snout. Stood on top of it they
  // march off past the nose and the ship looks like it is eating the void.
  const teeth = Array.from({ length: 6 }, (_, i) => {
    const x = 36 + i * 5.2
    const drop = 4.6 - Math.abs(i - 2.5) * 0.5
    return `M${x} ${2.6 + i * 0.35} l2.6 ${drop} l2.6 ${-drop} Z`
  }).join(' ')

  return (
    <g transform="translate(160 100)">
      <Engines x={-60} spread={11} />
      {/* Tail, then the fins, then the body over the top of them. */}
      <Solid d="M-56 -4 L-80 -26 L-72 0 L-80 22 L-56 6 Z" fill={p.deck} strokeWidth={0.9} />
      <Solid d="M-8 -20 L8 -44 L28 -17 Z" fill={p.deck} strokeWidth={0.9} />
      <Solid d="M-6 10 L-30 34 L16 17 Z" fill={p.deck} strokeWidth={0.9} opacity={0.95} />

      <Solid
        d="M-58 -5 C-40 -22 -2 -28 32 -19 C50 -14 64 -6 70 1 C58 10 22 18 -18 16 C-38 15 -52 10 -58 5 Z"
        fill={p.hull}
      />
      {/* The pale belly — a shark is two colours and this is the one that says so. */}
      <Solid
        d="M-54 6 C-24 15 16 14 66 3 C58 9 24 18 -18 16 C-36 15 -48 11 -54 6 Z"
        fill={p.canvas}
        strokeWidth={0.7}
      />
      {/* The mouth, and the teeth hanging off it. */}
      <path d="M33 2 C45 5 58 5 68 1" stroke={p.trim} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d={teeth} fill={tintUp(p.canvas, 0.6)} />
      {/* Gills. */}
      <g stroke={p.trim} strokeWidth="1.3" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M-30 -10 q-3 7 -1 14 M-23 -12 q-3 8 -1 15 M-16 -13 q-3 8 -1 16 M-9 -13 q-3 9 -1 16" />
      </g>
      {/* The bit that makes it a ship rather than a fish: somebody is flying it. */}
      <Solid d="M-2 -18 C6 -24 18 -25 26 -21 C18 -16 6 -15 -2 -16 Z" fill={GLASS} strokeWidth={0.7} />
      <path d="M8 -22.5 v6 M17 -22.5 v6" stroke={p.trim} strokeWidth="0.9" opacity="0.6" />
      <Portholes at={[[-44, 2], [-37, 5]]} p={p} r={2} />
      {/* The eye. Open, friendly, and never a slit — nothing in this app menaces. */}
      <circle cx="38" cy="-9" r="5" fill={GLASS} />
      <circle cx="39" cy="-9" r="2.5" fill={shade(p.hull, 0.7)} />
      <circle cx="36.6" cy="-10.4" r="1.1" fill="#ffffff" opacity="0.9" />
    </g>
  )
}

/**
 * 420 credits, and the top of the slot: part vessel, part something that swims.
 * A mantle with three canopies under it, cream wings, and six arms trailing
 * behind with the suckers drawn in. If this doesn't obviously out-detail the
 * palace ship, the slot is broken — see CLAUDE.md.
 */
function Drifter({ p }) {
  // Six arms, each a curling ribbon. The suckers are sampled off the same
  // centreline, so they follow the curl instead of being sprinkled near it.
  // Each one leaves the mantle at its own point. Started from a single origin
  // they cross into one dark knot at the base and the ship grows a beard.
  // The curl has to push each arm AWAY from the middle of the fan. Curling them
  // all toward it — which is what happens if the sign is the same on both sides
  // — folds the whole lot into one bunch pointing the same way.
  const arms = [
    { at: [-10, -20], w: 13, line: armLine(206, 58, 28, 0.4) },
    { at: [-17, -13], w: 15, line: armLine(194, 72, 20, 1.7) },
    { at: [-21, -4], w: 16, line: armLine(182, 82, 8, 0.9) },
    { at: [-19, 5], w: 15, line: armLine(170, 76, -14, 2.3) },
    { at: [-13, 12], w: 13, line: armLine(158, 62, -26, 1.2) },
    { at: [-4, 17], w: 11, line: armLine(146, 50, -30, 2.1) },
  ]

  return (
    <g transform="translate(164 98)">
      <Engines x={-30} spread={12} />
      {arms.map((arm, i) => (
        <g key={i} transform={`translate(${arm.at[0]} ${arm.at[1]})`}>
          <Solid d={ribbon(arm.line, arm.w)} fill={i % 2 ? p.hull : p.deck} strokeWidth={0.8} />
          {[4, 8, 12].map((n) => (
            <circle key={n} cx={arm.line[n][0]} cy={arm.line[n][1]} r={2.4 - n * 0.09} fill={p.canvas} opacity="0.85" />
          ))}
        </g>
      ))}

      {/* Wings, out to either side and behind the mantle. Ribbed, or a pale
          shape sticking out from behind a dark one just reads as a mistake. */}
      {[
        { d: 'M-4 6 C-28 16 -42 34 -22 38 C-4 36 10 22 14 10 Z', ribs: 'M-6 10 C-16 20 -22 28 -20 34 M2 10 C-4 20 -8 28 -8 34' },
        { d: 'M-2 -10 C-26 -22 -40 -42 -20 -44 C-2 -40 12 -24 16 -12 Z', ribs: 'M-4 -14 C-14 -24 -20 -32 -18 -40 M4 -14 C-2 -24 -6 -32 -6 -40' },
      ].map((wing) => (
        <g key={wing.d}>
          <Solid d={wing.d} fill={p.canvas} strokeWidth={0.8} />
          <path d={wing.ribs} stroke={shade(p.canvas, 0.22)} strokeWidth="0.9" fill="none" opacity="0.7" />
        </g>
      ))}

      {/* The mantle. */}
      <Blob cx={16} cy={-4} rx={44} ry={26} fill={p.hull} strokeWidth={1.1} />
      {/* A scalloped frill along its lower edge, which is most of what makes it
          read as a creature rather than an egg. */}
      <path
        d="M-24 6 q6 9 12 0 q6 9 12 0 q6 9 12 0 q6 9 12 0 q6 9 12 0 q6 9 12 0"
        fill={p.deck}
        opacity="0.9"
      />
      <path
        d="M-26 3 C-8 15 34 16 58 2"
        stroke={p.trim}
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
      {/* A crest along the top, echoing the frill below it. */}
      <path
        d="M-8 -24 q7 -8 13 -1 q7 -9 13 -1 q7 -8 13 0"
        fill="none"
        stroke={p.pale}
        strokeWidth="2"
        opacity="0.75"
        strokeLinecap="round"
      />
      {/* Markings: rings, which read at this size where flat spots did not. */}
      {[[4, -12, 5], [24, -8, 4], [42, -2, 3]].map(([x, y, r]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={p.pale} opacity="0.4" />
          <circle cx={x} cy={y} r={r + 1.6} fill="none" stroke={p.pale} strokeWidth="1.1" opacity="0.55" />
        </g>
      ))}

      {/* Three canopies, which is where the crew actually sit. */}
      <Blob cx={-4} cy={-18} rx={11} ry={9} fill={GLASS} outline={false} />
      <Blob cx={20} cy={-21} rx={9} ry={7.5} fill={GLASS} outline={false} />
      <Blob cx={40} cy={-14} rx={7} ry={6} fill={GLASS} outline={false} />
      <g fill={p.trim} opacity="0.55">
        <rect x="-5" y="-27" width="2" height="18" rx="1" />
        <rect x="19" y="-29" width="2" height="16" rx="1" />
        <rect x="39" y="-20" width="1.6" height="12" rx="0.8" />
      </g>
      {/* Lamps under the mantle — a deep-sea thing, and it reads at a glance. */}
      {[[-14, 10], [4, 14], [24, 14], [44, 8]].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="5.5" fill={LAMP} opacity="0.22" />
          <circle cx={x} cy={y} r="2" fill={LAMP} />
        </g>
      ))}
    </g>
  )
}

const HULLS = {
  succulent: PodRunner,
  fern: Scout,
  monstera: Freighter,
  shark: Hammerhead,
  orchid: Cruiser,
  drifter: Drifter,
}

/** Docking lights: the guide strips along the bay. */
function DockingLights({ dim }) {
  return (
    <g>
      {[40, 76, 112, 208, 244, 280].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={164} width="8" height="4" rx="2" fill="#38bdf8" opacity={dim ? 0.35 : 0.9} />
          {dim ? null : <circle cx={x} cy={166} r="9" fill="#38bdf8" opacity="0.18" />}
        </g>
      ))}
      <rect x="24" y="176" width="272" height="3" rx="1.5" fill="#38bdf8" opacity={dim ? 0.2 : 0.45} />
    </g>
  )
}

/** The nebula you're moored beside. */
function NebulaView({ dim }) {
  return (
    <g opacity={dim ? 0.4 : 0.85}>
      <ellipse cx="248" cy="52" rx="66" ry="40" fill="#a855f7" opacity="0.3" />
      <ellipse cx="228" cy="64" rx="48" ry="26" fill="#38bdf8" opacity="0.28" />
      <ellipse cx="262" cy="42" rx="26" ry="18" fill="#f0abfc" opacity="0.25" />
    </g>
  )
}

function Decal({ dim }) {
  return (
    <g opacity={dim ? 0.5 : 1}>
      <circle cx="160" cy="150" r="11" fill="none" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M154 150 L160 143 L166 150 L160 157 Z" fill="#e2e8f0" />
    </g>
  )
}

function Pennants({ dim }) {
  const flags = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc']
  return (
    <g opacity={dim ? 0.55 : 1}>
      <path d="M40 26 Q160 48 280 26" stroke="#94a3b8" strokeWidth="1.2" fill="none" />
      {flags.map((fill, i) => {
        const t = (i + 0.5) / flags.length
        const fx = 40 + t * 240
        const fy = 26 + 22 * (1 - (2 * t - 1) ** 2)
        return <path key={fill} d={`M${fx - 8} ${fy} L${fx + 8} ${fy} L${fx} ${fy + 14} Z`} fill={fill} />
      })}
    </g>
  )
}

/** Flat amber at low opacity over near-black just goes muddy brown, so the
    halo is a gradient that actually fades out. */
function RunningLamp({ dim }) {
  return (
    <g>
      <circle cx="160" cy="150" r={dim ? 26 : 20} fill="url(#ship-lamp)" />
      <circle cx="160" cy="150" r="6" fill="#fff4cf" />
    </g>
  )
}

function AntennaArray({ dim }) {
  return (
    <g opacity={dim ? 0.55 : 1} stroke="#cbd5e1" fill="none" strokeWidth="1.4">
      <path d="M160 148 V166" />
      <path d="M160 152 l-14 -6 M160 158 l14 -6 M160 164 l-11 -5" />
      <circle cx="160" cy="170" r="4" fill="#38bdf8" stroke="none" opacity="0.9" />
    </g>
  )
}

const FLAIR = { suncatcher: Decal, bunting: Pennants, lantern: RunningLamp, chimes: AntennaArray }


/**
 * Deterministic scatter. Stepping a counter through a modulo lands points in
 * neat diagonal strings — snow came out looking like beads on a wire — so this
 * hashes the index instead. Same layout every render, like SpaceBackdrop.
 */
function scatter(i, seed) {
  const t = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
  return t - Math.floor(t)
}

/**
 * Out there. Same slot as the windowsill's weather; in space it's whatever the
 * ship happens to be flying through.
 */
function Weather({ art, dim }) {
  if (art === 'rain') {
    // Charged particles, streaked by the ship's own motion.
    return (
      <g opacity={dim ? 0.45 : 0.8}>
        {Array.from({ length: 22 }, (_, i) => {
          const px = 10 + scatter(i, 1) * 300
          const py = 8 + scatter(i, 2) * 184
          return (
            <path
              key={i}
              d={`M${px} ${py} l18 3`}
              stroke="#7dd3fc"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity={i % 3 ? 0.7 : 1}
            />
          )
        })}
      </g>
    )
  }
  if (art === 'snow') {
    return (
      <g opacity={dim ? 0.5 : 0.9}>
        {Array.from({ length: 26 }, (_, i) => {
          const px = 8 + scatter(i, 3) * 304
          const py = 6 + scatter(i, 4) * 188
          const r = scatter(i, 5) > 0.8 ? 3.4 : 1.8
          return <circle key={i} cx={px} cy={py} r={r} fill="#dbeafe" opacity={scatter(i, 6) > 0.3 ? 0.7 : 1} />
        })}
      </g>
    )
  }
  if (art === 'glow') {
    return (
      <g opacity={dim ? 0.55 : 1}>
        <path d="M-10 60 Q80 24 160 58 Q250 92 330 48 L330 96 Q250 132 160 98 Q80 64 -10 100 Z" fill="url(#ship-aurora)" />
      </g>
    )
  }
  return null
}

/** A tender flying alongside for every companion bought — the same little
    sailed launch as everything else in the fleet, at half size. */
function Tender({ x, y, p, glow }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.48)`}>
      <path d="M-4 -8 V-26" stroke={p.keel} strokeWidth="2" strokeLinecap="round" />
      <path d="M-3 -25 C9 -21 12 -13 4 -8 L-3 -8 Z" fill={p.canvas} stroke={shade(p.canvas, 0.3)} strokeWidth="0.8" />
      <path
        d="M-26 -7 C-14 -12 2 -13 15 -7 C22 -4 22 4 15 7 C2 13 -14 12 -26 7 Z"
        fill={p.hull}
        stroke={shade(p.hull, 0.4)}
        strokeWidth="1"
      />
      <ellipse cx="8" cy="-1" rx="6" ry="4" fill={GLASS} opacity="0.9" />
      <path d="M-26 -5 L-40 0 L-26 5 Z" fill={glow} />
    </g>
  )
}

export default function Ship({ equipped = {}, companions = [], mood = MOOD.LIVELY }) {
  const dim = mood === MOOD.QUIET
  const hull = hullShade(equipped[SLOTS.FINISH]?.color ?? HULL_DEFAULT, mood)
  const p = palette(hull)
  const glow = dim ? '#3f5670' : '#5eead4'
  const Vessel = HULLS[equipped[SLOTS.VESSEL]?.art] ?? Shuttle
  const sceneArt = equipped[SLOTS.SCENE]?.art
  const FlairShape = FLAIR[equipped[SLOTS.FLAIR]?.art]
  const weatherArt = equipped[SLOTS.WEATHER]?.art

  const spots = [
    [56, 48],
    [262, 46],
    [70, 148],
    [258, 146],
    [40, 100],
    [286, 100],
  ]

  return (
    <svg
      viewBox="0 0 320 200"
      className="block h-auto w-full"
      role="img"
      aria-label={dim ? 'A ship at its mooring, running dark' : 'A ship at its mooring, lit up'}
    >
      <defs>
        <SceneDefs />
        <radialGradient id="ship-void" cx="50%" cy="30%">
          <stop offset="0%" stopColor={dim ? '#0a1120' : '#12233f'} />
          <stop offset="100%" stopColor="#04070f" />
        </radialGradient>
        {/* The engine wash: bright at the nozzle, gone by the end of the flame. */}
        <radialGradient id="ship-burn">
          <stop offset="0%" stopColor={glow} stopOpacity={dim ? 0.35 : 0.95} />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ship-aurora" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0" />
          <stop offset="45%" stopColor="#34d399" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#a855f7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ship-lamp">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        {/* The top light over every plate comes from `p-lit` in SceneDefs now,
            which is the same one the windowsill and the cats use. */}
      </defs>

      <rect width="320" height="200" fill="url(#ship-void)" />

      {/* A handful of fixed stars — the animated field is the page backdrop. */}
      {[
        [24, 30],
        [88, 18],
        [140, 44],
        [196, 24],
        [292, 62],
        [56, 122],
        [116, 178],
        [232, 168],
        [300, 132],
        [12, 88],
      ].map(([x, y], i) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#e8f4ff" opacity={dim ? 0.4 : 0.75} />
      ))}

      {sceneArt === 'curtain' ? <NebulaView dim={dim} /> : null}

      <Weather art={weatherArt} dim={dim} />

      {companions.slice(0, spots.length).map((companion, i) => (
        <Tender key={companion.id} x={spots[i][0]} y={spots[i][1]} p={p} glow={glow} />
      ))}

      <Vessel p={p} />

      {FlairShape ? <FlairShape dim={dim} /> : null}

      {sceneArt === 'herbs' ? <DockingLights dim={dim} /> : null}
    </svg>
  )
}
