import Sheet from './Sheet.jsx'
import { WelcomeContent } from './Welcome.jsx'

/** The visitor's overview, openable on purpose from Setup. */
export default function AboutSheet({ open, onClose }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="What this app is"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      <WelcomeContent />
    </Sheet>
  )
}
