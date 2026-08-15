import { SLOTS } from '../../config/catalog.js'
import { MOOD } from '../../lib/credits.js'

// The Homestead scene: a windowsill, whatever you've put on it, and the light.
//
// Inline SVG only — no image files. The service worker precaches the whole
// shell, and a scene that waits on a download is a scene that doesn't exist at
// the chicken coop. Everything here is drawn from two inputs: what's equipped,
// and the mood (see sceneMood in src/lib/credits.js). Quiet is dimmer light and
// a sleeping cat, never a dead plant.

const POT_DEFAULT = '#9a8577'

const LEAF = {
  lively: { light: '#7cc47f', mid: '#4b9a5b', dark: '#2f7043' },
  quiet: { light: '#6c9a74', mid: '#48765a', dark: '#33553f' },
}

function Sprout({ x, y, tint }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 V-18" stroke={tint.dark} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M0 -12 C-9 -16 -12 -24 -3 -24 C-1 -20 0 -16 0 -12 Z" fill={tint.mid} />
      <path d="M0 -16 C9 -20 12 -28 3 -28 C1 -24 0 -20 0 -16 Z" fill={tint.light} />
    </g>
  )
}

function Fern({ x, y, tint }) {
  const fronds = [-62, -40, -18, 4, 26, 48]
  return (
    <g transform={`translate(${x} ${y})`}>
      {fronds.map((angle, i) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path
            d="M0 0 C-3 -20 -2 -38 0 -52"
            stroke={i % 2 ? tint.mid : tint.dark}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {[10, 20, 30, 40].map((d) => (
            <g key={d}>
              <ellipse cx="-5" cy={-d} rx="5" ry="2.6" fill={i % 2 ? tint.light : tint.mid} />
              <ellipse cx="5" cy={-d} rx="5" ry="2.6" fill={i % 2 ? tint.mid : tint.dark} />
            </g>
          ))}
        </g>
      ))}
    </g>
  )
}

function Monstera({ x, y, tint }) {
  const leaf = (dx, dy, rot, size, fill) => (
    <g transform={`translate(${dx} ${dy}) rotate(${rot}) scale(${size})`}>
      <path
        d="M0 0 C-22 -6 -26 -32 0 -38 C26 -32 22 -6 0 0 Z"
        fill={fill}
      />
      {/* The splits that make a monstera a monstera. Kept short of the edge —
          a split that overshoots the leaf reads as a stray grey dash. */}
      <path d="M-4 -10 H-15 M-4 -20 H-17 M-4 -29 H-11" stroke="#1e4d33" strokeWidth="2.4" opacity="0.5" />
      <path d="M4 -14 H15 M4 -24 H15" stroke="#1e4d33" strokeWidth="2.4" opacity="0.5" />
    </g>
  )
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C-6 -18 -4 -34 -14 -44" stroke={tint.dark} strokeWidth="2.5" fill="none" />
      <path d="M0 0 C4 -20 8 -32 18 -42" stroke={tint.dark} strokeWidth="2.5" fill="none" />
      <path d="M0 0 V-52" stroke={tint.dark} strokeWidth="2.5" fill="none" />
      {leaf(-16, -44, -22, 1, tint.mid)}
      {leaf(20, -42, 24, 0.92, tint.light)}
      {leaf(0, -52, 2, 1.1, tint.dark)}
    </g>
  )
}

function Orchid({ x, y, tint, mood }) {
  const bloom = mood === MOOD.QUIET ? '#d9c3d2' : '#e8a9cd'
  const heart = mood === MOOD.QUIET ? '#b99cb2' : '#c76fa8'
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C-14 -4 -20 -10 -24 -14" stroke={tint.dark} strokeWidth="2" fill="none" />
      <ellipse cx="-26" cy="-14" rx="12" ry="4.5" fill={tint.mid} transform="rotate(-12 -26 -14)" />
      <ellipse cx="22" cy="-10" rx="12" ry="4.5" fill={tint.mid} transform="rotate(14 22 -10)" />
      <path d="M0 0 C2 -22 6 -40 2 -58" stroke={tint.dark} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {[
        [3, -26, 0.85],
        [1, -40, 1],
        [2, -54, 0.8],
      ].map(([bx, by, s]) => (
        <g key={by} transform={`translate(${bx} ${by}) scale(${s})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-6" rx="4.2" ry="6.5" fill={bloom} transform={`rotate(${a})`} />
          ))}
          <circle r="3" fill={heart} />
        </g>
      ))}
    </g>
  )
}

const PLANTS = { fern: Fern, monstera: Monstera, orchid: Orchid }

function Plant({ art, x, y, tint, mood }) {
  const Shape = PLANTS[art] ?? Sprout
  return <Shape x={x} y={y} tint={tint} mood={mood} />
}

function Pot({ x, y, width, color }) {
  const half = width / 2
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M${-half} 0 L${half} 0 L${half - width * 0.13} ${width * 0.62} L${-half + width * 0.13} ${width * 0.62} Z`}
        fill={color}
      />
      <rect x={-half - 2} y={-5} width={width + 4} height="7" rx="2" fill={color} />
      {/* A highlight down the left so the pot reads as round, not a trapezoid. */}
      <path
        d={`M${-half + 4} 2 L${-half + width * 0.17} ${width * 0.58}`}
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  )
}

function SleepingCat({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <ellipse cx="0" cy="0" rx="26" ry="11" fill="#8a7a6d" />
      <circle cx="-17" cy="-5" r="9" fill="#8a7a6d" />
      <path d="M-23 -11 l3 -7 l5 4 Z M-13 -12 l5 -6 l2 7 Z" fill="#8a7a6d" />
      {/* Tail curled round the front — the whole point of a sleeping cat. */}
      <path d="M20 2 C32 4 30 12 18 10" stroke="#8a7a6d" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M-21 -4 q3 2 6 0" stroke="#5c5048" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M-13 -4 q3 2 6 0" stroke="#5c5048" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Herbs({ tint }) {
  return (
    <g>
      {[
        [44, '#b4796a'],
        [70, '#a8886d'],
        [96, '#b4796a'],
      ].map(([hx, pot], i) => (
        <g key={hx}>
          <path d={`M${hx - 8} 152 L${hx + 8} 152 L${hx + 6} 164 L${hx - 6} 164 Z`} fill={pot} />
          <Sprout x={hx} y={152} tint={tint} />
          {i === 1 ? <Sprout x={hx + 5} y={152} tint={tint} /> : null}
        </g>
      ))}
    </g>
  )
}

function Curtain({ dim }) {
  return (
    <g opacity={dim ? 0.5 : 0.75}>
      <path
        d="M232 14 C244 40 236 70 246 100 C252 118 244 132 250 148 L272 148 L272 14 Z"
        fill="#ffffff"
        fillOpacity="0.5"
      />
      <path
        d="M240 14 C250 44 242 74 252 104"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        fill="none"
      />
    </g>
  )
}

function SunCatcher({ dim }) {
  const tints = ['#f5a3a3', '#f7d08a', '#9fd0e8', '#c4a8e6']
  return (
    <g opacity={dim ? 0.55 : 1}>
      <path d="M96 14 V38" stroke="#c9c1b6" strokeWidth="1.2" />
      <circle cx="96" cy="46" r="9" fill="#bfe3f2" fillOpacity="0.9" stroke="#ffffff" strokeOpacity="0.7" />
      {tints.map((tint, i) => (
        <rect
          key={tint}
          x={78 + i * 13}
          y={168}
          width="11"
          height="5"
          rx="2"
          fill={tint}
          opacity={dim ? 0.3 : 0.75}
        />
      ))}
    </g>
  )
}

function Bunting({ dim }) {
  const flags = ['#e8998d', '#efc98a', '#94c5b0', '#a7b8e0', '#dcaacb']
  return (
    <g opacity={dim ? 0.6 : 1}>
      <path d="M42 20 Q152 44 262 20" stroke="#cfc6ba" strokeWidth="1.4" fill="none" />
      {flags.map((fill, i) => {
        const t = (i + 0.5) / flags.length
        const fx = 42 + t * 220
        const fy = 20 + 24 * (1 - (2 * t - 1) ** 2)
        return <path key={fill} d={`M${fx - 8} ${fy} L${fx + 8} ${fy} L${fx} ${fy + 15} Z`} fill={fill} />
      })}
    </g>
  )
}

/** Hangs in the left pane — the sun lives on the right, and two glows in one
    corner just read as a smudge. */
function Lantern({ dim }) {
  return (
    <g>
      <path d="M100 14 V30" stroke="#c9c1b6" strokeWidth="1.2" />
      {/* It glows harder in the low light — that is what a lantern is for. */}
      <circle cx="100" cy="44" r={dim ? 30 : 26} fill="#ffd980" opacity={dim ? 0.3 : 0.22} />
      <ellipse cx="100" cy="44" rx="15" ry="16" fill="#ffe9b0" stroke="#d9c9a4" />
      <path d="M100 28 V60" stroke="#d9c9a4" strokeWidth="1" opacity="0.7" />
    </g>
  )
}

const FLAIR = { suncatcher: SunCatcher, bunting: Bunting, lantern: Lantern }

/**
 * @param equipped  { vessel, finish, scene, flair } — catalogue items or null
 * @param companions extra plants, one per purchase
 * @param mood      MOOD.LIVELY | MOOD.QUIET
 */
export default function Windowsill({ equipped = {}, companions = [], mood = MOOD.LIVELY }) {
  const dim = mood === MOOD.QUIET
  const tint = dim ? LEAF.quiet : LEAF.lively
  const potColor = equipped[SLOTS.FINISH]?.color ?? POT_DEFAULT
  const vesselArt = equipped[SLOTS.VESSEL]?.art
  const sceneArt = equipped[SLOTS.SCENE]?.art
  const FlairShape = FLAIR[equipped[SLOTS.FLAIR]?.art]

  // Companions line up along the sill either side of the main pot. Six is the
  // cap, which fits without anything overlapping the frame.
  const spots = [188, 214, 240, 24, 262, 152]

  return (
    <svg
      viewBox="0 0 320 200"
      className="block h-auto w-full"
      role="img"
      aria-label={dim ? 'A windowsill in the quiet evening light' : 'A sunlit windowsill'}
    >
      <defs>
        <linearGradient id="ws-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dim ? '#3d4a63' : '#a9d8f0'} />
          <stop offset="60%" stopColor={dim ? '#5c6178' : '#d6ecf7'} />
          <stop offset="100%" stopColor={dim ? '#7a7183' : '#f6e7c8'} />
        </linearGradient>
        <linearGradient id="ws-beam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3cd" stopOpacity={dim ? 0.06 : 0.55} />
          <stop offset="100%" stopColor="#fff3cd" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Wall */}
      <rect width="320" height="200" fill={dim ? '#2f2c33' : '#f3ece1'} />

      {/* The view out */}
      <rect x="34" y="8" width="252" height="140" rx="4" fill="url(#ws-sky)" />
      {dim ? (
        <>
          <circle cx="228" cy="42" r="13" fill="#f2eede" opacity="0.85" />
          <circle cx="223" cy="38" r="13" fill={dim ? '#5c6178' : 'none'} />
        </>
      ) : (
        <circle cx="228" cy="42" r="17" fill="#fff6d2" opacity="0.9" />
      )}
      {/* Hills, so the window looks out at something. */}
      <path d="M34 148 Q90 108 148 132 Q206 100 286 138 L286 148 Z" fill={dim ? '#3b4a44' : '#b8d3a8'} />

      {/* Light falling into the room */}
      <path d="M204 20 L286 20 L286 148 L124 160 Z" fill="url(#ws-beam)" />

      {/* Window frame */}
      <g fill="none" stroke={dim ? '#544d47' : '#e6dbc9'} strokeWidth="7">
        <rect x="34" y="8" width="252" height="140" rx="4" />
        <path d="M160 8 V148 M34 78 H286" strokeWidth="5" />
      </g>

      {sceneArt === 'curtain' ? <Curtain dim={dim} /> : null}

      {/* The sill itself */}
      <rect x="20" y="148" width="280" height="12" rx="3" fill={dim ? '#6b5f52' : '#e3d3b8'} />
      <rect x="20" y="160" width="280" height="5" rx="2" fill={dim ? '#544a40' : '#cdbb9d'} />

      {sceneArt === 'herbs' ? <Herbs tint={tint} /> : null}

      {/* The main plant */}
      <Plant art={vesselArt} x={152} y={148} tint={tint} mood={mood} />
      <Pot x={152} y={148} width={vesselArt === 'monstera' ? 54 : 42} color={potColor} />

      {/* Everything else you've bought */}
      {companions.slice(0, spots.length).map((companion, i) => (
        <g key={companion.id}>
          <Sprout x={spots[i]} y={150} tint={tint} />
          <Pot x={spots[i]} y={150} width={22} color={potColor} />
        </g>
      ))}

      {FlairShape ? <FlairShape dim={dim} /> : null}

      {/* Quiet evenings are for sleeping in the last of the light. */}
      {dim ? <SleepingCat x={64} y={186} /> : null}
    </svg>
  )
}
