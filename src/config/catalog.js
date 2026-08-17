// ============================================================================
// THE SHOP. Everything credits can buy.
// ============================================================================
//
// One catalogue drives all three looks. An item is the same purchase whichever
// theme you're in — only its name and its drawing change. Buy the big planter in
// Homestead and it's a freighter hull in Starship and a Maine Coon in Cats.
//
// **Ids are permanent.** They're how ownership is recorded, exactly like area
// and task ids. Renaming one un-buys it for everybody.
//
// Prices: a fully kept week is about 120 credits (see weeklyPointsGoal), so a
// 60-credit item is a few days and a 320-credit one is a few weeks. Nothing here
// changes how the chore app works — it is all decoration, on purpose.

export const SLOTS = {
  VESSEL: 'vessel',
  FINISH: 'finish',
  SCENE: 'scene',
  WEATHER: 'weather',
  FLAIR: 'flair',
}

export const ALL_SLOTS = Object.values(SLOTS)

/** Bought over and over — each one adds another plant / crew member / cat. */
export const COMPANION_ID = 'companion'
export const COMPANION_COST = 140
export const MAX_COMPANIONS = 6

/** The spend sink: 24 hours of extra life in the scene. */
export const TREAT_ID = 'treat'
export const TREAT_COST = 25
export const TREAT_HOURS = 24

const label = (home, starship, cats) => ({ home, starship, cats })

export const CATALOG = [
  // --- the main character -------------------------------------------------
  {
    id: 'vessel-succulent',
    slot: SLOTS.VESSEL,
    cost: 50,
    art: 'succulent',
    labels: label(
      { name: 'Succulent', note: 'Nearly impossible to disappoint.' },
      { name: 'Pod runner', note: 'One seat, no cargo, goes anywhere.' },
      { name: 'Kitten', note: 'Small. Extremely loud.' },
    ),
  },
  {
    id: 'vessel-fern',
    slot: SLOTS.VESSEL,
    cost: 80,
    art: 'fern',
    labels: label(
      { name: 'Boston fern', note: 'Fills out fast and forgives neglect.' },
      { name: 'Scout hull', note: 'Small, quick, easy to keep flying.' },
      { name: 'Tabby', note: 'Chatty, opinionated, always underfoot.' },
    ),
  },
  {
    id: 'vessel-monstera',
    slot: SLOTS.VESSEL,
    cost: 180,
    art: 'monstera',
    labels: label(
      { name: 'Monstera', note: 'Big leaves, takes up the whole sill.' },
      { name: 'Freighter', note: 'Broad in the beam, room for everything.' },
      { name: 'Maine Coon', note: 'Enormous. Astonishingly heavy.' },
    ),
  },
  {
    id: 'vessel-orchid',
    slot: SLOTS.VESSEL,
    cost: 320,
    art: 'orchid',
    labels: label(
      { name: 'Orchid', note: 'Fussy, and worth it when it blooms.' },
      { name: 'Cruiser', note: 'Elegant lines, obviously expensive.' },
      { name: 'Siamese', note: 'Elegant, vocal, deeply judgemental.' },
    ),
  },

  // --- colour -------------------------------------------------------------
  {
    id: 'finish-terracotta',
    slot: SLOTS.FINISH,
    cost: 60,
    art: 'terracotta',
    color: '#c2703d',
    labels: label(
      { name: 'Terracotta', note: 'Warm, plain, always right.' },
      { name: 'Rust livery', note: 'Honest working paint.' },
      { name: 'Ginger', note: 'Marmalade, through and through.' },
    ),
  },
  {
    id: 'finish-cobalt',
    slot: SLOTS.FINISH,
    cost: 120,
    art: 'cobalt',
    color: '#2f6fb5',
    labels: label(
      { name: 'Cobalt glaze', note: 'Deep blue, catches the light.' },
      { name: 'Cobalt livery', note: 'Naval blue with a hard shine.' },
      { name: 'Russian blue', note: 'Smoke grey, silver at the tips.' },
    ),
  },
  {
    id: 'finish-copper',
    slot: SLOTS.FINISH,
    cost: 260,
    art: 'copper',
    color: '#b8813a',
    labels: label(
      { name: 'Copper pot', note: 'Will go green eventually. That is the point.' },
      { name: 'Copper plating', note: 'Slightly ridiculous. Very shiny.' },
      { name: 'Tortoiseshell', note: 'No two patches the same.' },
    ),
  },

  {
    id: 'finish-sage',
    slot: SLOTS.FINISH,
    cost: 95,
    art: 'sage',
    color: '#7d9471',
    labels: label(
      { name: 'Sage glaze', note: 'Quiet green. Goes with everything.' },
      { name: 'Survey green', note: 'Standard issue, and none the worse.' },
      { name: 'Silver tabby', note: 'Grey on grey on grey.' },
    ),
  },
  {
    id: 'finish-blush',
    slot: SLOTS.FINISH,
    cost: 150,
    art: 'blush',
    color: '#d08a92',
    labels: label(
      { name: 'Blush pink', note: 'Bolder than it sounds.' },
      { name: 'Dawn livery', note: 'Pink, and unashamed about it.' },
      { name: 'Cream point', note: 'Pale, with warm ears.' },
    ),
  },

  // --- the setting --------------------------------------------------------
  {
    id: 'scene-herbs',
    slot: SLOTS.SCENE,
    cost: 90,
    art: 'herbs',
    labels: label(
      { name: 'Herb row', note: 'Basil, thyme, something unidentified.' },
      { name: 'Docking lights', note: 'Guide strips along the bay.' },
      { name: 'Window perch', note: 'Prime sunbathing real estate.' },
    ),
  },
  {
    id: 'scene-curtain',
    slot: SLOTS.SCENE,
    cost: 150,
    art: 'curtain',
    labels: label(
      { name: 'Lace curtain', note: 'Softens the afternoon glare.' },
      { name: 'Nebula view', note: 'Something enormous, very far away.' },
      { name: 'Sunny rug', note: 'Claimed within four minutes.' },
    ),
  },

  // --- what the sky is doing ----------------------------------------------
  // The cheapest slot to add that still changes the whole picture: each scene
  // already has gradients, so weather is one overlay layer per scene.
  {
    id: 'weather-rain',
    slot: SLOTS.WEATHER,
    cost: 110,
    art: 'rain',
    labels: label(
      { name: 'Rain on the glass', note: 'The best possible reason to stay in.' },
      { name: 'Ion drizzle', note: 'Charged particles, streaking past.' },
      { name: 'Rain outside', note: 'Which is why nobody has moved.' },
    ),
  },
  {
    id: 'weather-snow',
    slot: SLOTS.WEATHER,
    cost: 170,
    art: 'snow',
    labels: label(
      { name: 'First snow', note: 'Everything goes quiet.' },
      { name: 'Ice field', note: 'Drifting slowly, all the way past.' },
      { name: 'Snow outside', note: 'Watched intently from indoors.' },
    ),
  },
  {
    id: 'weather-glow',
    slot: SLOTS.WEATHER,
    cost: 240,
    art: 'glow',
    labels: label(
      { name: 'Golden hour', note: 'Twenty minutes, every single day.' },
      { name: 'Aurora', note: 'A ribbon of light along the hull.' },
      { name: 'Golden hour', note: 'Prime napping conditions.' },
    ),
  },

  // --- small joys ---------------------------------------------------------
  {
    id: 'flair-suncatcher',
    slot: SLOTS.FLAIR,
    cost: 70,
    art: 'suncatcher',
    labels: label(
      { name: 'Sun catcher', note: 'Throws rainbows on the wall at four.' },
      { name: 'Hull decal', note: 'A small act of vanity.' },
      { name: 'Bell collar', note: 'Early warning system.' },
    ),
  },
  {
    id: 'flair-bunting',
    slot: SLOTS.FLAIR,
    cost: 110,
    art: 'bunting',
    labels: label(
      { name: 'Paper bunting', note: 'No occasion required.' },
      { name: 'Signal pennants', note: 'Spelling something rude, probably.' },
      { name: 'Bow tie', note: 'Tolerated for up to a minute.' },
    ),
  },
  {
    id: 'flair-chimes',
    slot: SLOTS.FLAIR,
    cost: 160,
    art: 'chimes',
    labels: label(
      { name: 'Wind chimes', note: 'Tolerable at first.' },
      { name: 'Antenna array', note: 'Listening to something.' },
      { name: 'Jingle ball', note: 'Under the sofa within a day.' },
    ),
  },
  {
    id: 'flair-lantern',
    slot: SLOTS.FLAIR,
    cost: 200,
    art: 'lantern',
    labels: label(
      { name: 'Paper lantern', note: 'Glows once the sun goes.' },
      { name: 'Running lamp', note: 'Warm light in a cold place.' },
      { name: 'Night light', note: 'For the 3am zoomies.' },
    ),
  },
]

/** Cheapest first inside each slot, so the shop reads as a ladder to climb. */
export const CATALOG_BY_SLOT = Object.fromEntries(
  ALL_SLOTS.map((slot) => [
    slot,
    CATALOG.filter((item) => item.slot === slot).sort((a, b) => a.cost - b.cost),
  ]),
)

const BY_ID = Object.fromEntries(CATALOG.map((item) => [item.id, item]))

export function itemById(id) {
  return BY_ID[id] ?? null
}

/** The name and blurb for an item in the look you're currently wearing. */
export function itemLabel(item, themeId) {
  return item?.labels?.[themeId] ?? item?.labels?.home ?? { name: '', note: '' }
}

export const COMPANION = {
  id: COMPANION_ID,
  cost: COMPANION_COST,
  labels: label(
    { name: 'Another plant', note: 'The sill can always take one more.' },
    { name: 'Crew member', note: 'Someone else to do a shift.' },
    { name: 'Another cat', note: 'This is how it starts.' },
  ),
}

export const TREAT = {
  id: TREAT_ID,
  cost: TREAT_COST,
  labels: label(
    { name: 'Plant food', note: 'A day of showing off.' },
    { name: 'Fuel cell', note: 'Engines lit for a day.' },
    { name: 'A treat', note: 'Purring for the next day.' },
  ),
}
