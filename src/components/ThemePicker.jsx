import { useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider.jsx'

// A little swatch strip so each option shows what it looks like before you pick it.
const PREVIEWS = {
  home: { canvas: '#f1f5f9', dots: ['#0f172a', '#f59e0b', '#0ea5e9', '#10b981'] },
  starship: { canvas: '#04070f', dots: ['#22d3ee', '#fbbf24', '#38bdf8', '#a78bfa'] },
}

function Preview({ themeId }) {
  const preview = PREVIEWS[themeId] ?? PREVIEWS.home
  return (
    <div
      className="flex h-9 w-14 shrink-0 items-center justify-center gap-1 rounded-lg border"
      style={{ background: preview.canvas, borderColor: 'rgba(127,127,127,0.35)' }}
    >
      {preview.dots.map((dot) => (
        <span key={dot} className="h-2 w-2 rounded-full" style={{ background: dot }} />
      ))}
    </div>
  )
}

export default function ThemePicker({ open, onClose }) {
  const { themeId, themes, setTheme } = useTheme()

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Stop the page behind the sheet from scrolling.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a look"
        className="panel relative m-3 w-full max-w-md p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Choose a look</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg p-1.5 text-[var(--ink-3)] transition active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {themes.map((option) => {
            const Icon = option.icon
            const active = option.id === themeId
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setTheme(option.id)
                  onClose()
                }}
                aria-pressed={active}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--surface-2)]'
                    : 'border-[var(--line)] bg-transparent'
                }`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--line)',
                    color: 'var(--accent)',
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug font-semibold text-[var(--ink)]">{option.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-[var(--ink-2)]">{option.tagline}</p>
                </div>

                <Preview themeId={option.id} />

                {active ? (
                  <Check className="h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={2.6} />
                ) : (
                  <span className="h-5 w-5 shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-center text-xs text-[var(--ink-3)]">
          Your tasks and history stay exactly the same.
        </p>
      </div>
    </div>
  )
}
