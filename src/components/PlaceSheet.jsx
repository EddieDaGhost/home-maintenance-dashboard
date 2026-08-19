import { useEffect, useState } from 'react'
import { Check, MapPin, Navigation } from 'lucide-react'
import { UNITS } from '../lib/places.js'
import { lookupPlace } from '../lib/forecast.js'
import { usePlaces } from '../state/PlacesProvider.jsx'
import Sheet from './Sheet.jsx'

/**
 * The only form in the app that causes anything to leave the device, so it says
 * so in plain words. That sentence is part of the feature, not decoration.
 */
export default function PlaceSheet({ open, onClose }) {
  const { places, setHome, setUnits, setWork, clearHome, clearWork } = usePlaces()
  const [town, setTown] = useState('')
  const [work, setWorkField] = useState('')
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState(null)

  // Reopening should show what's saved, not whatever was half-typed last time.
  useEffect(() => {
    if (!open) return
    setTown(places.home?.query ?? '')
    setWorkField(places.work ?? '')
    setError(null)
    setLooking(false)
  }, [open, places.home?.query, places.work])

  const units = places.home?.units ?? UNITS.F

  const lookUp = async () => {
    setLooking(true)
    setError(null)
    try {
      const found = await lookupPlace(town)
      // Keep whichever unit is already chosen rather than resetting it.
      setHome({ ...found, units })
    } catch (problem) {
      // A failed lookup leaves the saved place alone — being offline shouldn't
      // cost you the town you set last week.
      setError(problem.message)
    } finally {
      setLooking(false)
    }
  }

  const saveWork = () => {
    if (work.trim()) setWork(work)
    else clearWork()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Weather and the drive"
      footer={
        <button
          type="button"
          onClick={() => {
            saveWork()
            onClose()
          }}
          className="btn-primary h-11 w-full"
        >
          Done
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block">
            <span className="label mb-1 block">Where you are</span>
            <input
              type="text"
              id="place-town"
              className="field"
              placeholder="Town or ZIP"
              autoComplete="address-level2"
              value={town}
              onChange={(event) => setTown(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') lookUp()
              }}
            />
          </label>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            A town or a postcode — the forecast is looked up by place, not by street address.
          </p>

          <button
            type="button"
            onClick={lookUp}
            disabled={looking || !town.trim()}
            className="btn-secondary mt-2.5 h-11 w-full text-sm disabled:opacity-40"
          >
            {looking ? 'Looking…' : places.home ? 'Look it up again' : 'Look it up'}
          </button>

          {error ? (
            <p
              className="mt-2 rounded-xl p-2.5 text-xs leading-relaxed"
              style={{
                background: 'var(--attention-soft)',
                border: '1px solid var(--attention-line)',
                color: 'var(--attention-ink)',
              }}
            >
              {error}
            </p>
          ) : null}

          {places.home ? (
            <div className="mt-2.5 flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: 'var(--good)' }} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {places.home.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearHome()
                  setTown('')
                }}
                className="btn-secondary h-9 shrink-0 px-3 text-xs"
              >
                Forget it
              </button>
            </div>
          ) : null}
        </div>

        {places.home ? (
          <div>
            <span className="label mb-1 block">Degrees</span>
            <div className="flex gap-2">
              {[
                { id: UNITS.F, label: '°F' },
                { id: UNITS.C, label: '°C' },
              ].map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setUnits(choice.id)}
                  aria-pressed={units === choice.id}
                  className={
                    units === choice.id
                      ? 'btn-primary h-11 flex-1 text-sm'
                      : 'btn-secondary h-11 flex-1 text-sm'
                  }
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {units === choice.id ? <Check className="h-3.5 w-3.5" /> : null}
                    {choice.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <label className="block">
            <span className="label mb-1 block">Work</span>
            <input
              type="text"
              id="place-work"
              className="field"
              placeholder="Street address, or a place name"
              autoComplete="street-address"
              value={work}
              onChange={(event) => setWorkField(event.target.value)}
              onBlur={saveWork}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveWork()
              }}
            />
          </label>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This never goes anywhere. It fills in a Maps link when you tap it, and your phone
              works out the drive from where you actually are.
            </span>
          </p>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Looking up the weather sends the town you typed to Open-Meteo, which needs no account and
          keeps no key. It is the only thing in this app that leaves your phone apart from sharing,
          and it only happens once you fill this in.
        </p>
      </div>
    </Sheet>
  )
}
