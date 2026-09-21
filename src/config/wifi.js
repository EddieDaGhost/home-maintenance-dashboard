// The guest WiFi page, and the quiz standing in front of it.
//
// ── Read this before changing the password ────────────────────────────────
//
// This file is compiled into the JavaScript the site serves, so **whatever is
// written here is readable by anyone who opens the page source**. The quiz is
// a bit of fun on the way to the password, not a lock on it: a guest who knows
// how to open devtools can skip it, and no client-side gate can prevent that,
// because the password has to reach the browser in order to be shown at all.
//
// That is fine for a joke answer. Do not put a password here that you would
// mind a stranger reading.
//
// It has to live in the bundle rather than in settings, because a guest opens
// the page on *their own* phone: their browser has none of your localStorage,
// and they aren't in your household, so there is no other way for the answer
// to reach them.
//
// Changing any of this means editing this file and redeploying.

export const NETWORK = {
  /** Exactly as it appears in the phone's WiFi list. */
  ssid: 'NachoWiFi',
  password: 'pacostacos111',
  /** Shown under the password once it's revealed. Optional. */
  note: 'Same network for everything — there is no separate guest one.',
}

/** The house rules, stated before the first question. */
export const RULES = [
  'This is an open-book quiz. Look anything up you like.',
  'Helping each other is not required, and is quietly frowned upon.',
  'There is no time limit and no score. You just have to get there.',
]

/**
 * The quiz.
 *
 * `answer` is the canonical spelling — it's what gets shown back and what the
 * retype step is built from. `accept` is the extra spellings a person might
 * reasonably type; matching is case-insensitive and ignores punctuation and
 * spacing either way, so there is no need to list case variants here.
 */
export const QUESTIONS = [
  {
    id: 'president',
    question: 'Who was the 16th President of the United States?',
    answer: 'Abraham Lincoln',
    accept: ['lincoln'],
  },
  {
    id: 'baking-soda',
    question: 'What is the chemical formula for baking soda?',
    note: 'Any numbers are typed normally — no subscript needed.',
    answer: 'NaHCO3',
  },
  {
    id: 'ocean',
    question: 'What is the largest ocean on Earth?',
    answer: 'Pacific',
    accept: ['pacific ocean', 'the pacific', 'the pacific ocean'],
  },
  {
    id: 'mvp',
    question: 'Who was the MVP of Super Bowl XXIX?',
    answer: 'Steve Young',
    accept: ['young'],
  },
  {
    id: 'spice',
    question: "What spice is the world's most expensive by weight?",
    answer: 'Saffron',
  },
  {
    id: 'animal',
    question: 'What is the fastest land animal?',
    answer: 'Cheetah',
  },
  {
    id: 'playwright',
    question: 'Who wrote the play Romeo and Juliet?',
    answer: 'Shakespeare',
    accept: ['william shakespeare'],
  },
  {
    id: 'moons',
    question: 'How many moons does Saturn have?',
    answer: '293',
  },
  {
    id: 'album',
    question: 'Which Beatles album features the song "Come Together"?',
    answer: 'Abbey Road',
  },
]
