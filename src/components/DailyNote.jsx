import { Sparkles } from 'lucide-react'
import { noteFor } from '../lib/notes.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

/**
 * A kind word at the top of the dashboard. One a day, in the voice of whichever
 * look you're in, and a tap gets you another.
 *
 * Things it deliberately is not:
 *
 * - **Not a notification.** It sits on a screen you opened. Nothing is pushed,
 *   nothing is scheduled, and design rule 1 stays intact.
 * - **Not aware of your history.** It never reads the log, so it cannot have an
 *   opinion about a quiet week — see the rules at the top of config/notes.js.
 * - **Not a live region.** It changes on a tap, which the person doing the
 *   tapping already knows about; announcing it would be the app talking
 *   unprompted, which is the thing it does not do.
 *
 * The whole card is the button. Tapping a note for another one is the only
 * thing you would want to do with it, and a separate shuffle control would be a
 * 20px target next to a 300px one that does nothing.
 */
export default function DailyNote({ now, shuffle = 0, onShuffle }) {
  const { themeId } = useTheme()
  const note = noteFor(themeId, now, shuffle)
  if (!note) return null

  return (
    <button
      type="button"
      onClick={onShuffle}
      aria-label={`${note} Tap for another note.`}
      className="panel flex w-full items-start gap-3 p-3.5 text-left transition active:scale-[0.99]"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
      <span className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--ink-2)' }}>
        {note}
      </span>
    </button>
  )
}
