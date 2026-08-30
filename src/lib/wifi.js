// Marking the quiz, and building the retyping step.
//
// Pure — no React, no storage. Nothing here is written to the visitor's
// browser: a guest who taps the tag by the door should be able to do the whole
// thing and leave without the app having stored a single key on their phone.
// That means quiz progress lives in component state and is lost on a refresh,
// which is the right trade for somebody else's device.
//
// None of this is security. See the note at the top of src/config/wifi.js.

import { QUESTIONS } from '../config/wifi.js'

/**
 * What two answers have to share to count as the same one.
 *
 * Case, spacing and punctuation all go, so "abraham lincoln", "Abraham
 * Lincoln" and "Lincoln, Abraham" are one answer. Being strict about any of
 * those would only ever punish somebody who knew the answer.
 */
export function normalizeAnswer(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Every spelling a question will take. */
export function acceptedFor(question) {
  return [question.answer, ...(question.accept ?? [])].map(normalizeAnswer)
}

export function isCorrect(question, given) {
  const normalized = normalizeAnswer(given)
  if (!normalized) return false
  return acceptedFor(question).includes(normalized)
}

/**
 * Mark the lot. Returns which ids are wrong rather than a score — the screen
 * says "these three need another look", never "6/9".
 */
export function markQuiz(answers = {}, questions = QUESTIONS) {
  const wrong = questions.filter((question) => !isCorrect(question, answers[question.id])).map((q) => q.id)
  return { wrong, allCorrect: wrong.length === 0, answered: questions.filter((q) => normalizeAnswer(answers[q.id])).length }
}

// ---------------------------------------------------------------------------
// The retyping step
// ---------------------------------------------------------------------------

/**
 * Every answer, run together, in question order.
 *
 * Built from the canonical `answer` rather than from what the person typed, so
 * two people who both got it right have the same thing to type — and so the
 * length shown on screen is a fact rather than a guess.
 */
export function retypeTarget(questions = QUESTIONS) {
  // Whitespace inside an answer goes too — "no spaces in between" means none
  // anywhere, and the string is shown on screen as the thing to match.
  return questions.map((question) => question.answer.replace(/\s+/g, '')).join('')
}

/** Compared the same forgiving way as the quiz itself. */
export function retypeMatches(typed, questions = QUESTIONS) {
  return normalizeAnswer(typed) === normalizeAnswer(retypeTarget(questions))
}

/**
 * How far along the typing is, and whether it has gone wrong yet.
 *
 * Telling somebody at character 60 that the whole thing is wrong would be
 * miserable, so the box says as soon as it stops matching — `strayed` is true
 * the moment what's typed is no longer the start of what's wanted.
 */
export function retypeProgress(typed, questions = QUESTIONS) {
  const want = normalizeAnswer(retypeTarget(questions))
  const got = normalizeAnswer(typed)
  return {
    typed: got.length,
    total: want.length,
    strayed: got.length > 0 && !want.startsWith(got),
    done: got === want,
  }
}

/**
 * Did this change come from typing, or from a paste?
 *
 * The paste and drop events are blocked directly on the input, which covers
 * the ordinary routes including iOS long-press. This is the backstop for the
 * rest — autofill, a keyboard suggestion replacing a whole word, and anything
 * else that arrives as one large jump.
 */
export const MAX_JUMP = 2

export function looksPasted(before, after, jump = MAX_JUMP) {
  return String(after ?? '').length - String(before ?? '').length > jump
}
