/** Simple SRS intervals in days after each successful review */
const INTERVALS = [1, 3, 7, 14, 30, 60];

export function dueDateFrom(stage = 0) {
  const days = INTERVALS[Math.min(stage, INTERVALS.length - 1)];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDue(card, today) {
  if (!card || !card.due) return true;
  return card.due <= today;
}

export function onCorrect(card = {}) {
  const stage = Math.min((card.stage || 0) + 1, INTERVALS.length - 1);
  return { stage, due: dueDateFrom(stage), correct: (card.correct || 0) + 1, wrong: card.wrong || 0 };
}

export function onWrong(card = {}) {
  return { stage: 0, due: dueDateFrom(0), correct: card.correct || 0, wrong: (card.wrong || 0) + 1 };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
