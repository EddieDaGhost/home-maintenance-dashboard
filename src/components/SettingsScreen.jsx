import { useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarPlus,
  ChevronRight,
  CloudSun,
  Download,
  Eraser,
  Info,
  Link2,
  ListPlus,
  Nfc,
  RotateCcw,
  Sunrise,
  Upload,
  Users,
  Wifi,
} from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'
import { usePeople } from '../state/PeopleProvider.jsx'
import { useAway } from '../state/AwayProvider.jsx'
import { usePlaces } from '../state/PlacesProvider.jsx'
import ThemePicker from './ThemePicker.jsx'
import AboutSheet from './AboutSheet.jsx'
import ShareSheet from './ShareSheet.jsx'
import TagSetup from './TagSetup.jsx'
import HouseholdSheet from './HouseholdSheet.jsx'
import FreshStartSheet from './FreshStartSheet.jsx'
import PlaceSheet from './PlaceSheet.jsx'
import ImportSheet from './ImportSheet.jsx'
import ResetSheet from './ResetSheet.jsx'

/**
 * One row. `detail` is optional and deliberately used sparingly — it earns its
 * second line only when it carries live state (your town, whether sharing is
 * on, which look you're in). A subtitle that just restates the label is what
 * turned this list into a wall in the first place.
 */
function SettingsRow({ icon: Icon, label, detail, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:scale-[0.99]"
    >
      <Icon className="h-5 w-5 shrink-0" style={{ color: tone ?? 'var(--ink-2)' }} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold" style={{ color: tone ?? 'var(--ink)' }}>
          {label}
        </span>
        {detail ? (
          <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
            {detail}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
    </button>
  )
}

function Group({ title, children }) {
  return (
    <section>
      <h2 className="section-title mb-2 px-1">{title}</h2>
      <div className="panel settings-list overflow-hidden">{children}</div>
    </section>
  )
}

/**
 * Everything you set up once and then leave alone.
 *
 * It lives on its own screen because as a section of the dashboard it had grown
 * to fifteen identical rows below three cards — long enough that the things you
 * actually come back to (History, Away) were buried in the middle of it. The
 * dashboard keeps those two and a way in here.
 *
 * Weather and the credits scene are deliberately not duplicated as rows: both
 * already have a card on the dashboard. Weather is here under Your day because
 * that's where you'd go looking to change your town.
 */
export default function SettingsScreen({
  log,
  now,
  onBack,
  onExport,
  onBackup,
  onRestore,
  onReset,
  onScratch,
  onOpenWifi,
  onToast,
  sync,
}) {
  const { theme, copy } = useTheme()
  const { nameFor } = useNames()
  const { custom, hiddenAreas, restoreArea, restoreStarterRooms } = useAreas()
  const { activePerson, isShared } = usePeople()
  const { hasFreshStart, freshStartLabel } = useAway()
  const { places } = usePlaces()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [householdOpen, setHouseholdOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [freshOpen, setFreshOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [putAwayOpen, setPutAwayOpen] = useState(false)
  const fileInput = useRef(null)

  const ThemeIcon = theme.icon

  return (
    <div className="space-y-5 pb-10">
      <header className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="panel flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-95"
          style={{ color: 'var(--ink-2)' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          {copy.settingsTitle}
        </h1>
      </header>

      <Group title="Your home">
        <SettingsRow icon={ListPlus} label="Import a list" onClick={() => setImportOpen(true)} />
        {hiddenAreas.length > 0 ? (
          <SettingsRow
            icon={RotateCcw}
            label="Rooms you've put away"
            detail={`${hiddenAreas.length} ${hiddenAreas.length === 1 ? 'room' : 'rooms'}`}
            onClick={() => setPutAwayOpen((open) => !open)}
          />
        ) : null}
        {putAwayOpen && hiddenAreas.length > 0 ? (
          <div className="space-y-1.5 px-4 py-3">
            {hiddenAreas.map((area) => (
              <div key={area.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--ink-2)' }}>
                  {nameFor(area)}
                </span>
                <button
                  type="button"
                  onClick={() => restoreArea(area.id)}
                  className="btn-secondary flex h-8 items-center gap-1.5 px-2.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Bring back
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {/* Only offered once the starter home has been dismissed wholesale —
            see the note on `fromScratch` in src/lib/custom.js. */}
        {custom.fromScratch ? (
          <SettingsRow
            icon={RotateCcw}
            label="Bring back the starter rooms"
            detail="The seven the app came with"
            onClick={restoreStarterRooms}
          />
        ) : null}
        <SettingsRow
          icon={Wifi}
          label="The WiFi"
          detail="What a guest sees at the sticker by the door"
          onClick={onOpenWifi}
        />
        <SettingsRow icon={Nfc} label="NFC tags" onClick={() => setTagsOpen(true)} />
      </Group>

      <Group title="Household">
        <SettingsRow
          icon={Users}
          label="Who's logging"
          detail={isShared ? `Currently ${activePerson.name}` : undefined}
          onClick={() => setHouseholdOpen(true)}
        />
        <SettingsRow
          icon={Link2}
          label={sync?.isSharing ? 'Shared with your household' : 'Share with another device'}
          detail={
            sync?.isSharing
              ? sync.status.state === 'error'
                ? "Sharing on — couldn't reach the server"
                : 'Everyone sees the same history'
              : undefined
          }
          onClick={() => setShareOpen(true)}
        />
      </Group>

      <Group title="Your day">
        <SettingsRow
          icon={CloudSun}
          label="Weather and the drive"
          detail={places.home?.label ?? undefined}
          onClick={() => setPlaceOpen(true)}
        />
        <SettingsRow
          icon={Sunrise}
          label="Start fresh"
          detail={hasFreshStart() ? `Clean slate since ${freshStartLabel()}` : undefined}
          onClick={() => setFreshOpen(true)}
        />
        <SettingsRow icon={CalendarPlus} label={copy.exportLabel} onClick={onExport} />
      </Group>

      <Group title="This app">
        <SettingsRow
          icon={ThemeIcon}
          label="Look"
          detail={theme.name}
          onClick={() => setPickerOpen(true)}
        />
        <SettingsRow icon={Info} label="What this app is" onClick={() => setAboutOpen(true)} />
      </Group>

      <Group title="Your data">
        <SettingsRow icon={Download} label="Back up my data" onClick={onBackup} />
        <SettingsRow
          icon={Upload}
          label="Restore from a backup"
          onClick={() => fileInput.current?.click()}
        />
        {/* The only row that takes something away, and the only one wearing
            --alert-*. CLAUDE.md reserves those colours for exactly this. */}
        <SettingsRow
          icon={Eraser}
          label="Start again…"
          detail="Clear the scoreboard, or empty the house"
          tone="var(--alert-ink)"
          onClick={() => setResetOpen(true)}
        />
      </Group>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Choose a backup file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onRestore(file)
          // Clear it so choosing the same file twice still fires.
          event.target.value = ''
        }}
      />

      <p className="px-1 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        Your history lives only in this browser. Backing up now and then is the only way to survive
        clearing your Safari data or moving to a new phone.
      </p>

      <ThemePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} onToast={onToast} />
      <FreshStartSheet open={freshOpen} onClose={() => setFreshOpen(false)} now={now} />
      <TagSetup open={tagsOpen} onClose={() => setTagsOpen(false)} />
      <HouseholdSheet
        open={householdOpen}
        onClose={() => setHouseholdOpen(false)}
        log={log}
        now={now}
      />
      {sync ? <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} sync={sync} /> : null}
      <ResetSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        log={log}
        onReset={onReset}
        onScratch={onScratch}
        onBackup={onBackup}
        sharing={sync?.isSharing}
      />
    </div>
  )
}
