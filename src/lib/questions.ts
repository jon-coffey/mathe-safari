export type Question = {
  a: number;
  b: number;
  answer: number;
};

export function makeQuestion(maxFactor: number = 10): Question {
  const a = Math.floor(Math.random() * (maxFactor + 1));
  const b = Math.floor(Math.random() * (maxFactor + 1));
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
