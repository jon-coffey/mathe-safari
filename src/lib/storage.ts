export const HS_TIME = "mathe-safari:highscore";
export const TRAINING_LEVEL = "mathe-safari:training-level";

export function getHighscore(): number {
  try {
    const v = localStorage.getItem(HS_TIME);
    return v ? parseInt(v) : 0;
  } catch {
    return 0;
  }
}

export function setHighscore(score: number) {
  try {
    const old = getHighscore();
    if (score > old) localStorage.setItem(HS_TIME, String(score));
  } catch {}
}

export function getTrainingLevel(): number {
  try {
    const v = localStorage.getItem(TRAINING_LEVEL);
    return v ? parseInt(v) : 1;
  } catch {
    return 1;
  }
}

export function setTrainingLevel(level: number) {
  try {
    localStorage.setItem(TRAINING_LEVEL, String(level));
  } catch {}
}
