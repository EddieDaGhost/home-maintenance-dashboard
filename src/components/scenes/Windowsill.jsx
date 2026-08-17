import { SLOTS } from '../../config/catalog.js'
import { MOOD } from '../../lib/credits.js'
import { Blob, Ground, SceneDefs, Solid, shade, tintUp } from './parts.jsx'

// The Homestead scene: a windowsill, whatever you've put on it, and the light.
//
// Inline SVG only — no image files. The service worker precaches the whole
// shell, and a scene that waits on a download is a scene that doesn't exist at
// the chicken coop. Everything here is drawn from two inputs: what's equipped,
// and the mood (see sceneMood in src/lib/credits.js). Quiet is dimmer light and
// a sleeping cat, never a dead plant.

const POT_DEFAULT = '#9a8577'

/**
 * The sky, top to bottom. Weather has to change the light or it reads as
 * decoration stuck on a sunny day — rain falling past a bright sun is a
 * sun-shower, which is not what anybody bought.
 */
const SKY = {
  clear: ['#a9d8f0', '#d6ecf7', '#f6e7c8'],
  rain: ['#7d93a6', '#a8bcc7', '#c9d4d6'],
  snow: ['#9fb4c9', '#c8d7e4', '#e8eef2'],
  glow: ['#79b4dd', '#ffd49a', '#ff9f5e'],
  night: ['#3d4a63', '#5c6178', '#7a7183'],
}

const LEAF = {
  lively: { light: '#7cc47f', mid: '#4b9a5b', dark: '#2f7043' },
  quiet: { light: '#6c9a74', mid: '#48765a', dark: '#33553f' },
}

function Sprout({ x, y, tint }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C-1 -8 1 -13 0 -19" stroke={tint.dark} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <Solid d="M0 -12 C-9 -16 -12 -25 -3 -25 C-1 -20 0 -16 0 -12 Z" fill={tint.mid} strokeWidth={0.7} />
      <Solid d="M0 -16 C9 -20 12 -29 3 -29 C1 -24 0 -20 0 -16 Z" fill={tint.light} strokeWidth={0.7} />
    </g>
  )
}

/**
 * Fronds that taper. The first pass used identical ellipses all the way up,
 * which is what made it read as a bottle brush rather than a fern.
 */
function Fern({ x, y, tint }) {
  const fronds = [-68, -46, -24, -2, 20, 42, 62]
  return (
    <g transform={`translate(${x} ${y})`}>
      {fronds.map((angle, i) => {
        const length = i % 2 ? 54 : 46
        const near = i % 2 ? tint.light : tint.mid
        const far = i % 2 ? tint.mid : tint.dark
        return (
          <g key={angle} transform={`rotate(${angle})`}>
            <path
              d={`M0 2 C-4 ${-length * 0.4} -2 ${-length * 0.75} 1 ${-length}`}
              stroke={far}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {[0.24, 0.42, 0.58, 0.72, 0.85].map((t) => {
              const d = length * t
              // Leaflets shrink and sweep upward toward the tip.
              const size = 6.4 * (1 - t * 0.72)
              const lean = 10 + t * 26
              return (
                <g key={t}>
                  <Blob cx={-size - 1} cy={-d} rx={size} ry={size * 0.44} fill={near} rotate={lean} outline={false} />
                  <Blob cx={size + 1} cy={-d} rx={size} ry={size * 0.44} fill={far} rotate={-lean} outline={false} />
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

/**
 * A monstera is a heart with pieces cut out of it. The first pass drew circles
 * with grey dashes laid over them, which read as a bush with scratches — the
 * notches have to come out of the silhouette itself.
 */
function Monstera({ x, y, tint }) {
  const leaf = (dx, dy, rot, size, fill) => (
    <g key={`${dx}-${dy}`} transform={`translate(${dx} ${dy}) rotate(${rot}) scale(${size})`}>
      <Solid
        d={
          'M0 2 C-13 0 -22 -9 -23 -19 ' +
          'L-14 -17 L-21 -23 C-21 -29 -17 -34 -11 -37 ' +
          'L-8 -30 L-8 -38 C-5 -39 -2 -40 0 -40 ' +
          'C2 -40 5 -39 8 -38 L8 -30 L11 -37 ' +
          'C17 -34 21 -29 21 -23 L14 -17 L23 -19 ' +
          'C22 -9 13 0 0 2 Z'
        }
        fill={fill}
        strokeWidth={0.9}
      />
      {/* The midrib and the veins running out to each lobe. */}
      <path
        d="M0 1 V-38 M0 -12 L-14 -18 M0 -12 L14 -18 M0 -24 L-9 -32 M0 -24 L9 -32"
        stroke={shade(fill, 0.3)}
        strokeWidth="0.9"
        fill="none"
        opacity="0.75"
      />
    </g>
  )
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 2 C-6 -16 -6 -32 -15 -42" stroke={tint.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M0 2 C4 -18 9 -30 19 -40" stroke={tint.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M0 2 V-50" stroke={tint.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {leaf(-17, -42, -24, 0.92, tint.mid)}
      {leaf(21, -40, 26, 0.86, tint.light)}
      {leaf(0, -50, 2, 1.06, tint.dark)}
    </g>
  )
}

/**
 * The 320-credit item, and it has to look like it: five blooms on an arching
 * spike, a bud still to open, aerial roots over the rim, and proper strap
 * leaves. Detail is the thing you're actually buying at the top of a slot.
 */
function Orchid({ x, y, tint, mood }) {
  const bloom = mood === MOOD.QUIET ? '#d9c3d2' : '#eaa8cf'
  const heart = mood === MOOD.QUIET ? '#a98aa4' : '#b8559b'

  const flower = (bx, by, size, rot) => (
    <g key={`${bx}-${by}`} transform={`translate(${bx} ${by}) rotate(${rot}) scale(${size})`}>
      {/* Three broad petals behind, two narrow ones in front — an orchid, not a daisy. */}
      {[200, 340, 90].map((a) => (
        <Blob key={a} cx={0} cy={-6.5} rx={5} ry={7} fill={bloom} rotate={a} outline={false} />
      ))}
      {[250, 290].map((a) => (
        <Blob key={a} cx={0} cy={-5.5} rx={3.4} ry={6} fill={tintUp(bloom, 0.3)} rotate={a} outline={false} />
      ))}
      <Blob cx={0} cy={1.5} rx={4} ry={4.6} fill={heart} outline={false} />
      <circle cy="0.5" r="1.4" fill={tintUp(bloom, 0.55)} />
    </g>
  )

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Aerial roots, over the rim of the pot. */}
      <path
        d="M-9 2 C-15 6 -19 10 -17 15 M7 2 C13 7 15 12 12 16"
        stroke={tintUp(tint.mid, 0.35)}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Strap leaves at the base. */}
      <Solid d="M-2 2 C-16 0 -26 -6 -30 -13 C-24 -18 -12 -15 -2 -6 Z" fill={tint.mid} strokeWidth={0.8} />
      <Solid d="M2 2 C15 1 24 -4 28 -10 C22 -15 11 -12 2 -4 Z" fill={tint.dark} strokeWidth={0.8} />
      {/* The spike, arching over as they do. */}
      <path
        d="M0 0 C3 -18 10 -34 8 -52 C7 -60 2 -63 -4 -63"
        stroke={tint.dark}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {flower(6, -22, 0.86, -6)}
      {flower(10, -35, 1, 4)}
      {flower(9, -48, 0.94, 12)}
      {flower(0, -60, 0.8, 26)}
      {/* One still to open. */}
      <Blob cx={-6} cy={-63} rx={2.8} ry={4} fill={tintUp(bloom, 0.2)} rotate={30} outline={false} />
    </g>
  )
}

/**
 * The 50-credit first purchase. Deliberately the plainest thing in the shop —
 * a squat rosette — because the cheap end should look cheap next to the orchid.
 */
function Succulent({ x, y, tint }) {
  const petal = (angle, length, fill) => (
    <Blob
      key={`${angle}-${length}`}
      cx={0}
      cy={-length / 2}
      rx={5.4}
      ry={length / 2}
      fill={fill}
      rotate={angle}
      strokeWidth={0.7}
    />
  )
  return (
    <g transform={`translate(${x} ${y - 11}) scale(1.25)`}>
      {[0, 60, 120, 180, 240, 300].map((a) => petal(a, 26, tint.mid))}
      {[30, 90, 150, 210, 270, 330].map((a) => petal(a, 18, tint.light))}
      <Blob cx={0} cy={0} rx={4.4} ry={4.4} fill={tint.dark} strokeWidth={0.7} />
    </g>
  )
}

const PLANTS = { succulent: Succulent, fern: Fern, monstera: Monstera, orchid: Orchid }

function Plant({ art, x, y, tint, mood }) {
  const Shape = PLANTS[art] ?? Sprout
  return <Shape x={x} y={y} tint={tint} mood={mood} />
}

function Pot({ x, y, width, color }) {
  const half = width / 2
  const depth = width * 0.62
  return (
    <g>
      <Ground x={x} y={y + depth} w={width * 1.5} />
      <g transform={`translate(${x} ${y})`}>
        <Solid
          d={`M${-half} 0 L${half} 0 L${half - width * 0.13} ${depth} Q0 ${depth + width * 0.1} ${-half + width * 0.13} ${depth} Z`}
          fill={color}
        />
        {/* The rim, as a band with its own lit top edge — this is what makes a
            pot look like a cylinder rather than a trapezoid. */}
        <Solid d={`M${-half - 2.5} -6 L${half + 2.5} -6 L${half + 2.5} 1.5 L${-half - 2.5} 1.5 Z`} fill={color} />
        <ellipse cx="0" cy="-6" rx={half + 2.5} ry={width * 0.11} fill={shade(color, 0.42)} />
        <ellipse cx="0" cy="-6" rx={half - 0.5} ry={width * 0.085} fill={shade(color, 0.62)} />
        <path
          d={`M${-half + 4.5} 4 Q${-half + 3} ${depth * 0.6} ${-half + width * 0.19} ${depth - 3}`}
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </g>
  )
}

function SleepingCat({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <Ground x={0} y={9} w={62} opacity={0.7} />
      <Blob cx={0} cy={0} rx={26} ry={11} fill="#8a7a6d" />
      <Blob cx={-17} cy={-5} rx={9} ry={9} fill="#8a7a6d" />
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
          <Ground x={hx} y={164} w={22} />
          <Solid d={`M${hx - 8} 152 L${hx + 8} 152 L${hx + 6} 164 L${hx - 6} 164 Z`} fill={pot} />
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

function Chimes({ dim }) {
  const tubes = [0, 1, 2, 3]
  return (
    <g opacity={dim ? 0.6 : 1}>
      <path d="M62 14 V26" stroke="#c9c1b6" strokeWidth="1.2" />
      <ellipse cx="62" cy="28" rx="13" ry="3" fill="#b9a88f" />
      {tubes.map((i) => {
        const tx = 50 + i * 8
        const length = 26 + (i % 2 ? 10 : 0)
        return (
          <g key={tx}>
            <path d={`M${tx} 29 V${29 + length}`} stroke="#cbb9a0" strokeWidth="1" />
            <rect x={tx - 2} y={29 + length} width="4" height="16" rx="2" fill="#d9c9a4" />
          </g>
        )
      })}
    </g>
  )
}

const FLAIR = { suncatcher: SunCatcher, bunting: Bunting, lantern: Lantern, chimes: Chimes }


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
 * Weather sits over the glass, so it reads as outside rather than in the room.
 * Every scene draws its own; only this one has a window to run down.
 */
function Weather({ art, dim }) {
  if (art === 'rain') {
    return (
      <g opacity={dim ? 0.5 : 0.75}>
        {Array.from({ length: 26 }, (_, i) => {
          const rx = 40 + scatter(i, 1) * 240
          const ry = 14 + scatter(i, 2) * 126
          return (
            <path
              key={i}
              d={`M${rx} ${ry} l-2.5 9`}
              stroke="#d7ecf7"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.8"
            />
          )
        })}
        {/* A couple of fat drops holding on to the glass. */}
        {[[92, 96], [176, 62], [242, 118]].map(([dx, dy]) => (
          <circle key={dx} cx={dx} cy={dy} r="3" fill="#e8f6ff" opacity="0.55" />
        ))}
      </g>
    )
  }
  if (art === 'snow') {
    return (
      <g>
        {Array.from({ length: 30 }, (_, i) => {
          const sx = 38 + scatter(i, 3) * 244
          const sy = 12 + scatter(i, 4) * 130
          return <circle key={i} cx={sx} cy={sy} r={scatter(i, 5) > 0.75 ? 2.6 : 1.6} fill="#ffffff" opacity={dim ? 0.55 : 0.85} />
        })}
        {/* Settled along the bottom of the frame. */}
        <path d="M34 148 q40 -8 80 -2 q46 -8 90 -1 q40 -6 82 3 L286 148 Z" fill="#ffffff" opacity="0.7" />
      </g>
    )
  }
  if (art === 'glow') {
    return (
      <g>
        <rect x="34" y="8" width="252" height="140" fill="url(#ws-golden)" />
      </g>
    )
  }
  return null
}

/**
 * @param equipped  { vessel, finish, scene, flair, weather } — items or null
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
  const weatherArt = equipped[SLOTS.WEATHER]?.art
  const overcast = weatherArt === 'rain' || weatherArt === 'snow'
  const sky = dim ? SKY.night : (SKY[weatherArt] ?? SKY.clear)

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
        <SceneDefs />
        <linearGradient id="ws-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="60%" stopColor={sky[1]} />
          <stop offset="100%" stopColor={sky[2]} />
        </linearGradient>
        <linearGradient id="ws-golden" x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0%" stopColor="#ffb257" stopOpacity={dim ? 0.4 : 0.62} />
          <stop offset="65%" stopColor="#ffd98f" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffd98f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ws-beam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3cd" stopOpacity={dim ? 0.06 : overcast ? 0.14 : 0.55} />
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
          <circle cx="223" cy="38" r="13" fill="#5c6178" />
        </>
      ) : weatherArt === 'rain' ? null : (
        <circle
          cx="228"
          cy={weatherArt === 'glow' ? 66 : 42}
          r={weatherArt === 'glow' ? 21 : 17}
          fill={weatherArt === 'glow' ? '#fff0c0' : '#fff6d2'}
          opacity={weatherArt === 'snow' ? 0.4 : 0.9}
        />
      )}
      {/* Hills, so the window looks out at something. */}
      <path
        d="M34 148 Q90 108 148 132 Q206 100 286 138 L286 148 Z"
        fill={dim ? '#3b4a44' : weatherArt === 'snow' ? '#dfe8ea' : weatherArt === 'rain' ? '#93ab8d' : '#b8d3a8'}
      />

      <Weather art={weatherArt} dim={dim} />

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
