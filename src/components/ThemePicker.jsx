import { Check } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider.jsx'
import Sheet from './Sheet.jsx'

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

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Choose a look"
      footer={
        <p className="text-center text-xs" style={{ color: 'var(--ink-3)' }}>
          Your tasks and history stay exactly the same.
        </p>
      }
    >
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
              className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.98]"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--line)',
                background: active ? 'var(--surface-2)' : 'transparent',
              }}
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
                <p className="text-[15px] leading-snug font-semibold" style={{ color: 'var(--ink)' }}>
                  {option.name}
                </p>
                <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--ink-2)' }}>
                  {option.tagline}
                </p>
              </div>

              <Preview themeId={option.id} />

              {active ? (
                <Check className="h-5 w-5 shrink-0" strokeWidth={2.6} style={{ color: 'var(--accent)' }} />
              ) : (
                <span className="h-5 w-5 shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
