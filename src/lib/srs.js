// SuperMemo-2 / FSRS Spaced Repetition System (SRS v3.8)
// Complete algorithm with 4 response grades, memory stability, and interval predictions.

const MIN_EASE = 1.3;
const MAX_EASE = 3.2;

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function isDue(card, today = todayStr()) {
  return !card?.dueAt || String(card.dueAt) <= today;
}

export function normalize(card = {}) {
  return {
    version: 3,
    stage: Number(card.stage) || 0,
    ease: Number(card.ease) || 2.5,
    interval: Number(card.interval) || 0,
    dueAt: card.dueAt || card.due || null,
    repetitions: Number(card.repetitions) || 0,
    lapses: Number(card.lapses) || 0,
    stability: Number(card.stability) || 1.0,
    difficulty: Number(card.difficulty) || 5.0
  };
}

/**
 * Reviews a card with a quality grade:
 * 1 = AGAIN (повне забуття)
 * 2 = HARD (згадав з великими труднощами)
 * 3 = GOOD (нормальне правильне згадування)
 * 4 / 5 = EASY (миттєва впевнена відповідь)
 */
export function review(card = {}, quality = 3, latencyMs = null) {
  const c = normalize(card);
  let q = Math.max(1, Math.min(5, Math.round(Number(quality) || 3)));
  
  // Latency intelligence: if latency is provided and very fast (<1.5s), promote Good to Easy
  if (latencyMs != null && q === 3 && latencyMs < 1500) {
    q = 4;
  } else if (latencyMs != null && q === 3 && latencyMs > 5000) {
    q = 2; // hesitating
  }

  let ease = c.ease;
  let stage = c.stage;
  let interval = c.interval;
  let reps = c.repetitions;
  let lapses = c.lapses;
  let stability = c.stability;
  let difficulty = c.difficulty;

  if (q >= 3) {
    // Correct recall
    if (q === 4 || q === 5) {
      // EASY
      ease = Math.min(MAX_EASE, ease + 0.15);
      difficulty = Math.max(1.0, difficulty - 0.5);
      stage = Math.min(10, stage + 2);
      interval = reps === 0 ? 2 : reps === 1 ? 5 : Math.max(2, Math.round(interval * ease * 1.3));
    } else {
      // GOOD
      difficulty = Math.max(1.0, difficulty - 0.1);
      stage = Math.min(10, stage + 1);
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, Math.round(interval * ease));
    }
    reps += 1;
    stability = Number((stability * (1 + 0.2 * ease)).toFixed(2));
  } else if (q === 2) {
    // HARD (correct but struggled)
    ease = Math.max(MIN_EASE, ease - 0.15);
    difficulty = Math.min(10.0, difficulty + 0.3);
    interval = Math.max(1, Math.round(interval * 1.2));
    stage = Math.max(1, stage);
    reps += 1;
  } else {
    // AGAIN (Forgot / Wrong)
    ease = Math.max(MIN_EASE, ease - 0.2);
    difficulty = Math.min(10.0, difficulty + 0.8);
    stage = 0;
    interval = 1;
    reps = 0;
    lapses += 1;
    stability = 0.8;
  }

  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + interval);

  return {
    version: 3,
    stage,
    ease: Number(ease.toFixed(2)),
    interval,
    dueAt: d.toISOString().slice(0, 10),
    repetitions: reps,
    lapses,
    stability,
    difficulty: Number(difficulty.toFixed(1)),
    lastQuality: q
  };
}

/**
 * Predicts next interval in days for all 4 grades on this card
 */
export function predictIntervals(card = {}) {
  const c = normalize(card);
  const ease = c.ease;
  const reps = c.repetitions;
  const currInterval = c.interval;

  const againDays = 1;
  const hardDays = Math.max(1, Math.round(currInterval * 1.2)) || 1;
  const goodDays = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, Math.round(currInterval * ease));
  const easyDays = reps === 0 ? 2 : reps === 1 ? 5 : Math.max(2, Math.round(currInterval * ease * 1.3));

  const formatDays = (days) => {
    if (days === 1) return '1 д';
    if (days < 30) return `${days} д`;
    const months = Math.round(days / 30);
    return `${months} міс`;
  };

  return {
    again: { days: againDays, label: formatDays(againDays) },
    hard: { days: hardDays, label: formatDays(hardDays) },
    good: { days: goodDays, label: formatDays(goodDays) },
    easy: { days: easyDays, label: formatDays(easyDays) }
  };
}

export function onCorrect(card = {}) {
  return review(card, 3);
}

export function onWrong(card = {}) {
  return review(card, 1);
}

export function onEasy(card = {}) {
  return review(card, 4);
}

export function onHard(card = {}) {
  return review(card, 2);
}

export const initSrsCard = normalize;
export const applySrsReview = review;
export const testFSRSStep = review;
