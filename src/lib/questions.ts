export type Question = {
  a: number;
  b: number;
  answer: number;
};

export function makeQuestion(maxFactor: number = 10, opts?: { avoidTrivial?: boolean }): Question {
  const avoidTrivial = opts?.avoidTrivial !== false; // default true
  const pool = (() => {
    const hi = Math.max(2, Math.min(9, Math.floor(maxFactor)));
    if (avoidTrivial) {
      // 2..hi (usually 2..9)
      return Array.from({ length: hi - 1 }, (_, i) => i + 2);
    }
    // 0..maxFactor
    return Array.from({ length: Math.floor(maxFactor) + 1 }, (_, i) => i);
  })();
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const a = pick();
  const b = pick();
  return { a, b, answer: a * b };
}

export function formatQuestion(q: Question) {
  return `${q.a} × ${q.b}`;
}

export function checkAnswer(q: Question, input: number) {
  return q.answer === input;
}

export function nextDifficultyFromStreak(streak: number) {
  // Simple progression for training mode
  if (streak < 5) return 5;
  if (streak < 10) return 7;
  if (streak < 20) return 10;
  if (streak < 30) return 12;
  return 15;
}
