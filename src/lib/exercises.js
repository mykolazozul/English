/** Template-based exercise generator from a word record */
export function generateExercises(w) {
  const word = w.word || '';
  const tr = w.translation || '';
  const ex = (w.example || (w.examples || '').split('\n')[0] || '').trim();
  const list = [];
  list.push({ type: 'flashcard', prompt: word, answer: tr, hint: w.explanation || '' });
  list.push({ type: 'quiz', prompt: `Що означає «${word}»?`, answer: tr });
  if (ex && word && ex.toLowerCase().includes(word.toLowerCase())) {
    const gap = ex.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '______');
    list.push({ type: 'gap', prompt: gap, answer: word });
  } else {
    list.push({ type: 'gap', prompt: `I need to use the word «______» (${tr}).`, answer: word });
  }
  list.push({ type: 'transform', prompt: `Зроби речення зі словом «${word}»`, answer: ex || word });
  list.push({ type: 'listen', prompt: word, answer: tr });
  list.push({ type: 'speak', prompt: `Скажи вголос: ${word}`, answer: word });
  list.push({ type: 'dialog', prompt: `A: What does "${word}" mean?\nB: It means ______.`, answer: tr });
  return list;
}

export function adaptAfterAnswer(card, ok) {
  // returns difficulty bias: more wrong → lower stage / more reviews
  const wrong = (card?.wrong || 0) + (ok ? 0 : 1);
  const correct = (card?.correct || 0) + (ok ? 1 : 0);
  const hard = wrong >= 2 && wrong > correct;
  return { hard, preferReview: hard };
}
