import { SLOTS } from '../../config/catalog.js'
import { MOOD } from '../../lib/credits.js'

// The Starship scene: your ship at its mooring, and whether the lights are on.
//
// Same inputs as the windowsill (see Windowsill.jsx) and the same rule: quiet
// means running dark on standby, never damaged. Nothing here is ever broken,
// scorched, leaking, or in need of repair.

const HULL_DEFAULT = '#7f93ad'

function hullShade(color, mood) {
  return mood === MOOD.QUIET ? '#5d6b7e' : color
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

/** One silhouette per hull: a single pointed shape, so nothing reads as a sofa. */
function Hull({ d, cockpit, hull, panels = [] }) {
  return (
    <g>
      <path d={d} fill={hull} />
      {/* A lit top edge and a shaded underside give the flat shape some depth. */}
      <path d={d} fill="url(#ship-sheen)" />
      {panels.map(([x, y, width, height]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} rx="3" fill="#0b1626" fillOpacity="0.22" />
      ))}
      <ellipse cx={cockpit[0]} cy={cockpit[1]} rx="9" ry="5.5" fill="#bfe7ff" opacity="0.95" />
    </g>
  )
}

/** The starter ship, before anything has been requisitioned. */
function Shuttle({ hull }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-46} spread={9} />
      <Hull d="M-46 -16 L16 -21 L54 0 L16 21 L-46 16 Z" cockpit={[26, 0]} hull={hull} />
    </g>
  )
}

function Scout({ hull }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-50} spread={9} />
      {/* Swept fins, drawn behind the hull so they read as attached. */}
      <path d="M-46 -12 L-34 -34 L-6 -22 Z" fill={hull} opacity="0.7" />
      <path d="M-46 12 L-34 34 L-6 22 Z" fill={hull} opacity="0.7" />
      <Hull d="M-50 -14 L14 -20 L60 0 L14 20 L-50 14 Z" cockpit={[30, 0]} hull={hull} />
    </g>
  )
}

function Freighter({ hull }) {
  return (
    <g transform="translate(158 100)">
      <Engines x={-70} spread={13} />
      <Hull
        d="M-70 -27 L20 -31 L74 0 L20 31 L-70 27 Z"
        cockpit={[46, 0]}
        hull={hull}
        panels={[
          [-58, -17, 24, 34],
          [-28, -19, 24, 38],
          [2, -19, 22, 38],
        ]}
      />
    </g>
  )
}

function Cruiser({ hull }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-74} spread={10} />
      <path d="M-64 -16 L-46 -42 L-4 -24 Z" fill={hull} opacity="0.65" />
      <path d="M-64 16 L-46 42 L-4 24 Z" fill={hull} opacity="0.65" />
      <Hull
        d="M-74 -12 L-26 -22 L40 -14 L84 0 L40 14 L-26 22 L-74 12 Z"
        cockpit={[52, 0]}
        hull={hull}
        panels={[[-20, -10, 40, 20]]}
      />
    </g>
  )
}

/** The 50-credit first purchase: one seat and an engine. */
function PodRunner({ hull }) {
  return (
    <g transform="translate(160 100)">
      <Engines x={-26} spread={6} />
      <Hull d="M-26 -12 L6 -14 L34 0 L6 14 L-26 12 Z" cockpit={[14, 0]} hull={hull} />
    </g>
  )
}

const HULLS = { succulent: PodRunner, fern: Scout, monstera: Freighter, orchid: Cruiser }

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

/** A tender flying alongside for every companion bought. */
function Tender({ x, y, hull, glow }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.42)`}>
      <path d="M-30 0 L-10 -12 L26 -10 L36 0 L26 10 L-10 12 Z" fill={hull} />
      <ellipse cx="16" cy="0" rx="7" ry="5" fill="#bfe7ff" opacity="0.9" />
      <path d="M-30 -5 L-46 0 L-30 5 Z" fill={glow} />
    </g>
  )
}

export default function Ship({ equipped = {}, companions = [], mood = MOOD.LIVELY }) {
  const dim = mood === MOOD.QUIET
  const hull = hullShade(equipped[SLOTS.FINISH]?.color ?? HULL_DEFAULT, mood)
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
        {/* Lit from above: a highlight along the top of any hull, shade beneath. */}
        <linearGradient id="ship-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
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
        <Tender key={companion.id} x={spots[i][0]} y={spots[i][1]} hull={hull} glow={glow} />
      ))}

      <Vessel hull={hull} />

      {FlairShape ? <FlairShape dim={dim} /> : null}

      {sceneArt === 'herbs' ? <DockingLights dim={dim} /> : null}
    </svg>
  )
}
