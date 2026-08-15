import { ArrowLeft, Check, Coins, Plus, Sparkles } from 'lucide-react'
import {
  ALL_SLOTS,
  CATALOG_BY_SLOT,
  COMPANION,
  COMPANION_COST,
  MAX_COMPANIONS,
  TREAT,
  TREAT_COST,
  TREAT_HOURS,
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
import Windowsill from './scenes/Windowsill.jsx'

const SLOT_TITLES = {
  vessel: { home: 'The plant', starship: 'The hull', cats: 'The cat' },
  finish: { home: 'The pot', starship: 'Livery', cats: 'Coat' },
  scene: { home: 'The window', starship: 'The dock', cats: 'The room' },
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
 */
function ShopRow({ item, themeId, balance, unit, owned, equipped, onBuy, onEquip, readOnly }) {
  const { name, note } = itemLabel(item, themeId)
  const affordable = canAfford(balance, item)

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {name}
        </span>
        <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
          {note}
        </span>
      </span>

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
  const { themeId, copy } = useTheme()
  const { allTasks } = useAreas()
  const { activePerson, activeId, people, isShared } = usePeople()
  const { entry, buyItem, equip, buyCompanion, buyTreat } = useEstate()

  const earned = creditsEarned(log, allTasks, activeId, people)
  const balance = creditsBalance(log, allTasks, activeId, people, entry)
  const unit = copy.creditsUnit
  const mood = sceneMood(log, now, allTasks, entry)
  const boosted = boostActive(entry, now.getTime())

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
  const roomForMore = entry.companions.length < MAX_COMPANIONS

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

      <section className="panel overflow-hidden">
        <Windowsill equipped={equippedItems(entry)} companions={entry.companions} mood={mood} />
        <p className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          {mood === MOOD.QUIET ? copy.estateQuiet : copy.estateLively}
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
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {companionLabel.name}
              </span>
              <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                {roomForMore
                  ? companionLabel.note
                  : `That's all ${MAX_COMPANIONS} — the sill is full.`}
              </span>
            </span>
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
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {treatLabel.name}
              </span>
              <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                {boosted ? 'Running now — buying again adds another day.' : treatLabel.note}
              </span>
            </span>
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
                owned={owns(entry, item.id)}
                equipped={entry.equipped[slot] === item.id}
                onBuy={buy}
                onEquip={equip}
                readOnly={readOnly}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
