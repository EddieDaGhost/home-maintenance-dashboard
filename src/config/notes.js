// ============================================================================
// THE NOTE — a kind word on the dashboard, one a day.
// ============================================================================
//
// Per theme, like `labels` in catalog.js and for the same reason: these are
// user-facing strings that a look renames, but there are ninety of them and
// dropping ninety strings into the `copy` object in themes.js would bury the
// forty that are actually wiring.
//
// ---------------------------------------------------------------------------
// What these are allowed to say — read this before adding one
// ---------------------------------------------------------------------------
//
// This is the app's one piece of unprompted encouragement, which puts it right
// next to two design rules it must not break:
//
//   Rule 1, no notifications. This is NOT one. Nothing is pushed, scheduled or
//   sent; it is a line on a screen you chose to open. The app still never
//   initiates contact, and nothing here may ever become something that does.
//
//   Rule 2, never guilt-trip. A note may never mention being behind, late,
//   missed or owed. No "don't forget", no "you should", no counting what hasn't
//   been done. They are deliberately written to be true whether you have logged
//   twelve things today or nothing in a fortnight — which is also why not one
//   of them looks at the log. A note that reacted to your history would
//   eventually have to have an opinion about a bad week, and the app doesn't
//   get to have one of those.
//
//   Rule 5, points are encouragement and never a target. Nothing here mentions
//   the streak, the weekly goal, credits, or a number of any kind.
//
// The test suite asserts the first and last of those against every string in
// this file, so a note that scolds fails `npm run check` rather than shipping.

/**
 * Twenty-eight per look. The count matters a little: the picker steps through
 * the list by a prime, so you see every one before any repeats — four weeks of
 * a note a day. See src/lib/notes.js.
 */
export const NOTES = {
  home: [
    'One small thing still counts as a thing.',
    'The house is never finished, and it is not supposed to be.',
    'A job started is most of a job done.',
    'The kettle is a perfectly good first step.',
    'Slow is a pace, not a verdict.',
    'Whatever you get to today is the right amount.',
    'Houses are kept, not conquered.',
    'Good enough is a real standard, and you are meeting it.',
    'You live here. It is allowed to look like somebody does.',
    'Put music on first. It genuinely helps.',
    'The list will keep. It is very patient.',
    'Small and often beats big and never.',
    'One thing done badly beats nothing done perfectly.',
    'Open a window. Count it as progress.',
    'You are allowed to stop halfway.',
    'This is maintenance, not an exam.',
    'Anything you do today, Saturday gets to keep.',
    'A tidy drawer is a small and completely legitimate joy.',
    'Nobody else looks at the corners. You may as well enjoy them.',
    'Tomorrow is also a day for this.',
    'Rest counts as looking after the place too.',
    'The floor will only get walked on again. Mop it anyway, or do not.',
    'You have done harder things before breakfast.',
    'Five minutes of tidying is five minutes of tidying.',
    'The bar is low and you keep stepping over it.',
    'Nothing in here is urgent.',
    'You are the reason this place works.',
    'You are doing fine. Genuinely.',
  ],

  starship: [
    "Ship's log: morale holding. Crew doing fine.",
    'All systems nominal. Including you.',
    'Maintenance is what keeps a ship a ship.',
    'No alarms, no emergencies. A good shift.',
    'The void is vast and patient. So is the list.',
    'Small repairs, indefinitely repeated. That is the whole job.',
    'You are the reason the lights are still on.',
    'Course steady. Nothing is required of you this minute.',
    'Every ship that ever made it was maintained by somebody tired.',
    'Recommend coffee. Recommend a short walk. Both are permitted.',
    'Deck by deck is a completely valid strategy.',
    'The log is a record, not a verdict.',
    'Anything you do this shift, the next shift gets to keep.',
    'A quiet bridge is a well-run bridge.',
    'You do not have to fix everything before the jump.',
    'Half a task is still more than no task.',
    'The hull is holding. So are you.',
    "Captain's discretion applies to absolutely all of this.",
    'Rest is a scheduled system function.',
    'Nothing out here is on fire.',
    'Logged is logged. The record is generous.',
    'Low power mode is an acceptable configuration.',
    'This vessel has survived worse than an unswept deck.',
    'Proceed at whatever speed you like.',
    'Somebody has to keep this thing flying, and today it is going well.',
    'Status: fine. Confidence: high.',
    'One entry in the log is one entry in the log.',
    'You are, by every available measure, doing fine.',
  ],

  cats: [
    'The cats think you are doing great. They think that about everything.',
    'No cat has ever kept a list. Consider their example.',
    'You feed them, therefore you are magnificent.',
    'A nap is a legitimate item on any list.',
    'Cats do one small thing a day and are revered for it.',
    'Sit down for a bit. Something warm will arrive.',
    'Cats do not do guilt. Be more cat.',
    'You are the staff and the management. Both are doing fine.',
    'The house is theirs. You are just very good at it.',
    'Whatever you get to today, you will still be headbutted for it.',
    'Slow is the correct speed. Ask anyone here with whiskers.',
    'Half done is a perfectly respectable place to stop.',
    'Nothing is on fire. Somebody is asleep in a sunbeam.',
    'Small and often is how a cat maintains an entire coat.',
    'The bar is low and covered in fur. You are clearing it.',
    'Put music on. They will pretend not to like it.',
    'Rest is what this household is built around.',
    'Nobody here is counting. Except possibly at dinner time.',
    'There is a cat asleep on the proof that you are doing fine.',
    'Every hair you remove is replaced overnight. Do it anyway, or do not.',
    'They have no idea what a Tuesday is and they are thriving.',
    'One thing today. That is the whole ask.',
    'Somebody in this house is extremely relaxed. Aim for that.',
    'You are allowed to stop halfway and go and stare at them.',
    'The good news is they cannot read the list either.',
    'Tomorrow is also a day for this. They will be here.',
    'You have been headbutted at least once today. That counts.',
    'You are doing fine, and they would say so if they could.',
  ],
}

/** Falls back to the plain voice, the way itemLabel() in catalog.js does. */
export function notesFor(themeId) {
  return NOTES[themeId] ?? NOTES.home
}
