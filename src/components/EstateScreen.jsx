import { useRef, useState } from 'react'
import { ArrowLeft, Check, Coins, Eye, Plus, Sparkles, X } from 'lucide-react'
import {
  ALL_SLOTS,
  CATALOG_BY_SLOT,
  COMPANION,
  COMPANION_COST,
  MAX_COMPANIONS,
  TREAT,
  TREAT_COST,
  TREAT_HOURS,
  COMPANION_ID,
  TREAT_ID,
  itemById,
  itemLabel,
} from '../config/catalog.js'
import {
  MOOD,
  boostActive,
  canAfford,
  creditsBalance,
  creditsEarned,
  equippedItems,
  owns,
  sceneMood,
} from '../lib/credits.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'
import { usePeople } from '../state/PeopleProvider.jsx'
import { useEstate } from '../state/EstateProvider.jsx'
import { useAway } from '../state/AwayProvider.jsx'
import Windowsill from './scenes/Windowsill.jsx'
import Ship from './scenes/Ship.jsx'
import Cats from './scenes/Cats.jsx'

/** Chosen by `progression.sceneKind` on the theme — see src/config/themes.js. */
const SCENES = { garden: Windowsill, ship: Ship, cats: Cats }

const SLOT_TITLES = {
  vessel: { home: 'The plant', starship: 'The hull', cats: 'The cat' },
  finish: { home: 'The pot', starship: 'Livery', cats: 'Coat' },
  scene: { home: 'The window', starship: 'The dock', cats: 'The room' },
  weather: { home: 'Weather', starship: 'Out there', cats: 'Weather' },
  flair: { home: 'Finishing touches', starship: 'Markings', cats: 'Accessories' },
}

function slotTitle(slot, themeId) {
  return SLOT_TITLES[slot]?.[themeId] ?? SLOT_TITLES[slot]?.home ?? slot
}

function Price({ cost, unit, affordable }) {
  return (
    <span
      className="numeral shrink-0 text-xs font-semibold tabular-nums"
      style={{ color: affordable ? 'var(--ink-2)' : 'var(--ink-3)' }}
    >
      {cost} {unit}
    </span>
  )
}

/**
 * One purchasable row. Three states: not yet affordable (still listed, with its
 * price — knowing what's coming is half the fun), affordable, and owned. Owned
 * items become a toggle for wearing them.
 *
 * Tapping the name tries it on, whether or not you can afford it. Looking is
 * free, and the thing you can't afford yet is the one most worth looking at.
 */
function ShopRow({ item, themeId, balance, unit, owned, equipped, trying, onBuy, onEquip, onTry, readOnly }) {
  const { name, note } = itemLabel(item, themeId)
  const affordable = canAfford(balance, item)

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <button
        type="button"
        onClick={() => onTry(item.id)}
        aria-label={`See ${name} in the scene`}
        aria-pressed={trying}
        className="min-w-0 flex-1 text-left transition active:scale-[0.98]"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          <span className="truncate">{name}</span>
          <Eye className="h-3.5 w-3.5 shrink-0" style={{ color: trying ? 'var(--accent)' : 'var(--ink-3)' }} />
        </span>
        <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
          {note}
        </span>
      </button>

      {owned ? (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onEquip(item.id)}
          aria-label={equipped ? `Put ${name} away` : `Use ${name}`}
          className={equipped ? 'btn-primary h-9 px-3 text-xs' : 'btn-secondary h-9 px-3 text-xs'}
        >
          {equipped ? (
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> In use
            </span>
          ) : (
            'Use'
          )}
        </button>
      ) : (
        <>
          <Price cost={item.cost} unit={unit} affordable={affordable} />
          <button
            type="button"
            disabled={!affordable || readOnly}
            onClick={() => onBuy(item)}
            aria-label={`Buy ${name} for ${item.cost} credits`}
            className="btn-primary h-9 px-3 text-xs"
            style={affordable ? undefined : { opacity: 0.35 }}
          >
            Buy
          </button>
        </>
      )}
    </div>
  )
}

export default function EstateScreen({ log, now, onBack, onToast, readOnly = false }) {
  const { themeId, theme, copy } = useTheme()
  const { allTasks } = useAreas()
  const { activePerson, activeId, people, isShared } = usePeople()
  const { entry, look, buyItem, equip, buyCompanion, renameCompanion, buyTreat } = useEstate()
  const { away } = useAway()

  const earned = creditsEarned(log, allTasks, activeId, people)
  const balance = creditsBalance(log, allTasks, activeId, people, entry)
  const unit = copy.creditsUnit
  const mood = sceneMood(log, now, allTasks, entry, away)
  const boosted = boostActive(entry, now.getTime())
  const Scene = SCENES[theme.progression?.sceneKind] ?? Windowsill

  // Trying something on. Local to this screen and never stored: nothing about a
  // preview should reach the estate, the sync, or anybody else's phone.
  const [tryingId, setTryingId] = useState(null)
  const sceneRef = useRef(null)

  const tryOn = (id) => {
    setTryingId((current) => (current === id ? null : id))
    // The shop runs well below the fold on a phone, and a preview you can't see
    // is not a preview.
    sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const trying = tryingId ? (tryingId === COMPANION_ID ? COMPANION : tryingId === TREAT_ID ? TREAT : itemById(tryingId)) : null
  const tryingLabel = trying ? itemLabel(trying, themeId) : null

  // What the scene draws: what you own, with the thing you're trying laid over
  // the top. Companions and the treat are scene inputs too, so they preview by
  // adding one to the list and by forcing the lively mood.
  const shown = equippedItems(look)
  if (trying?.slot) shown[trying.slot] = trying
  const shownCompanions =
    tryingId === COMPANION_ID ? [...look.companions, { id: 'preview', name: '' }] : look.companions
  const shownMood = tryingId === TREAT_ID ? MOOD.LIVELY : mood

  const buy = (item) => {
    buyItem(item, balance)
    onToast?.(`${itemLabel(item, themeId).name} — yours`)
  }

  const treat = () => {
    buyTreat(TREAT_COST, balance)
    onToast?.(itemLabel(TREAT, themeId).name)
  }

  const companion = () => {
    buyCompanion(COMPANION_COST, balance)
    onToast?.(itemLabel(COMPANION, themeId).name)
  }

  const companionLabel = itemLabel(COMPANION, themeId)
  const treatLabel = itemLabel(TREAT, themeId)
  const companionAffordable = balance >= COMPANION_COST
  const treatAffordable = balance >= TREAT_COST
  const roomForMore = look.companions.length < MAX_COMPANIONS

  return (
    <div className="space-y-5 pb-10">
      <header className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={copy.backLabel}
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95"
          style={{ color: 'var(--ink-2)' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            {copy.estateTitle}
          </h1>
          {/* Whose scene this is only matters once there's more than one person. */}
          {isShared ? (
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {activePerson.name}&apos;s, built from what {activePerson.name} logged
            </p>
          ) : null}
        </div>
      </header>

      <section className="panel overflow-hidden" ref={sceneRef}>
        <Scene equipped={shown} companions={shownCompanions} mood={shownMood} />

        {trying ? (
          <div
            className="flex items-center gap-2 px-3.5 py-2.5"
            style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Trying {tryingLabel.name}
              </span>
              <span className="numeral block text-xs" style={{ color: 'var(--ink-3)' }}>
                {trying.cost} {unit} · not bought yet
              </span>
            </span>
            <button
              type="button"
              onClick={() => setTryingId(null)}
              aria-label={`Stop trying ${tryingLabel.name}`}
              className="btn-secondary flex h-9 w-9 shrink-0 items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={balance < trying.cost || readOnly}
              onClick={() => {
                if (trying.id === COMPANION_ID) companion()
                else if (trying.id === TREAT_ID) treat()
                else buy(trying)
                setTryingId(null)
              }}
              /* Distinct from the shop row's own Buy button: two buttons with the
                 same name on one screen is ambiguous read aloud. */
              aria-label={
                balance >= trying.cost
                  ? `Buy ${tryingLabel.name} now`
                  : `${tryingLabel.name} costs ${trying.cost} credits, ${trying.cost - balance} more than you have`
              }
              className="btn-primary h-9 shrink-0 px-3 text-xs"
              style={balance < trying.cost ? { opacity: 0.35 } : undefined}
            >
              {balance < trying.cost ? `Need ${trying.cost - balance} more` : 'Buy it'}
            </button>
          </div>
        ) : null}

        <p className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          {trying ? 'Nothing has been spent — this is just a look.' : mood === MOOD.QUIET ? copy.estateQuiet : copy.estateLively}
        </p>
      </section>

      <section className="panel flex items-center gap-3 p-4">
        <Coins className="h-5 w-5 shrink-0" style={{ color: '#f59e0b' }} />
        <span className="min-w-0 flex-1">
          {/* The id is how the test suite reads the balance — several shop rows
              show the same number as a price, so text alone isn't specific. */}
          <span
            id="credit-balance"
            className="numeral block text-xl font-bold tabular-nums"
            style={{ color: 'var(--ink)' }}
          >
            {balance} {unit}
          </span>
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            {earned} earned in total, all time
          </span>
        </span>
      </section>

      <p className="px-1 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        {copy.estateBlurb}
      </p>

      {/* --- the repeatable and the consumable ------------------------------ */}
      <section>
        <h2 className="section-title mb-2.5 px-1">{copy.shopTitle}</h2>
        <div className="panel settings-list overflow-hidden">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <Plus className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
            <button
              type="button"
              onClick={() => tryOn(COMPANION_ID)}
              disabled={!roomForMore}
              aria-label={`See ${companionLabel.name} in the scene`}
              aria-pressed={tryingId === COMPANION_ID}
              className="min-w-0 flex-1 text-left transition active:scale-[0.98]"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                <span className="truncate">{companionLabel.name}</span>
                {roomForMore ? (
                  <Eye
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: tryingId === COMPANION_ID ? 'var(--accent)' : 'var(--ink-3)' }}
                  />
                ) : null}
              </span>
              <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                {roomForMore ? companionLabel.note : `That's all ${MAX_COMPANIONS}. That's plenty.`}
              </span>
            </button>
            {roomForMore ? (
              <>
                <Price cost={COMPANION_COST} unit={unit} affordable={companionAffordable} />
                <button
                  type="button"
                  disabled={!companionAffordable || readOnly}
                  onClick={companion}
                  aria-label={`Buy ${companionLabel.name} for ${COMPANION_COST} credits`}
                  className="btn-primary h-9 px-3 text-xs"
                  style={companionAffordable ? undefined : { opacity: 0.35 }}
                >
                  Buy
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3 px-3.5 py-3">
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
            <button
              type="button"
              onClick={() => tryOn(TREAT_ID)}
              aria-label={`See ${treatLabel.name} in the scene`}
              aria-pressed={tryingId === TREAT_ID}
              className="min-w-0 flex-1 text-left transition active:scale-[0.98]"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                <span className="truncate">{treatLabel.name}</span>
                <Eye
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: tryingId === TREAT_ID ? 'var(--accent)' : 'var(--ink-3)' }}
                />
              </span>
              <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                {boosted ? 'Running now — buying again adds another day.' : treatLabel.note}
              </span>
            </button>
            <Price cost={TREAT_COST} unit={unit} affordable={treatAffordable} />
            <button
              type="button"
              disabled={!treatAffordable || readOnly}
              onClick={treat}
              aria-label={`Buy ${treatLabel.name} for ${TREAT_COST} credits`}
              className="btn-primary h-9 px-3 text-xs"
              style={treatAffordable ? undefined : { opacity: 0.35 }}
            >
              Buy
            </button>
          </div>
        </div>
        <p className="mt-2 px-1 text-xs" style={{ color: 'var(--ink-3)' }}>
          {treatLabel.name} lasts {TREAT_HOURS} hours and then wears off. Everything else is
          yours for good.
        </p>
      </section>

      {/* --- naming what you've collected ---------------------------------- */}
      {look.companions.length ? (
        <section>
          <h2 className="section-title mb-2.5 px-1">{copy.shelfTitle}</h2>
          <div className="panel space-y-2 p-3.5">
            {look.companions.map((companion, index) => (
              <label key={companion.id} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                  {index + 1}
                </span>
                <input
                  className="field"
                  aria-label={`Name for ${companionLabel.name.toLowerCase()} ${index + 1}`}
                  placeholder={copy.companionPlaceholder}
                  value={companion.name}
                  disabled={readOnly}
                  onChange={(event) => renameCompanion(companion.id, event.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            Names are yours alone and travel with your scene. Leave them blank if you&apos;d rather.
          </p>
        </section>
      ) : null}

      {/* --- one section per slot ------------------------------------------ */}
      {ALL_SLOTS.map((slot) => (
        <section key={slot}>
          <h2 className="section-title mb-2.5 px-1">{slotTitle(slot, themeId)}</h2>
          <div className="panel settings-list overflow-hidden">
            {CATALOG_BY_SLOT[slot].map((item) => (
              <ShopRow
                key={item.id}
                item={item}
                themeId={themeId}
                balance={balance}
                unit={unit}
                owned={owns(look, item.id)}
                equipped={look.equipped[slot] === item.id}
                trying={tryingId === item.id}
                onBuy={buy}
                onEquip={equip}
                onTry={tryOn}
                readOnly={readOnly}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
