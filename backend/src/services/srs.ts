export interface CardSRS {
  interval: number;
  ease_factor: number;
  repetitions: number;
}

export type Quality = 0 | 1 | 2 | 3; // again, hard, good, easy

export function applyReview(card: CardSRS, quality: Quality): CardSRS & { due: number } {
  let { interval, ease_factor, repetitions } = card;

  if (quality === 0) {
    interval = 1;
    repetitions = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = quality === 3 ? 4 : 3;
    } else {
      interval = Math.round(interval * ease_factor);
    }
    if (quality === 1) interval = Math.max(1, interval - 1);
    if (quality === 3) interval = Math.round(interval * 1.3);
    ease_factor = Math.max(
      1.3,
      ease_factor + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)
    );
  }

  const due = Math.floor(Date.now() / 1000) + interval * 86400;
  return { interval, ease_factor, repetitions, due };
}

export function previewIntervals(card: CardSRS): Record<string, number> {
  return {
    again: applyReview({ ...card }, 0).interval,
    hard: applyReview({ ...card }, 1).interval,
    good: applyReview({ ...card }, 2).interval,
    easy: applyReview({ ...card }, 3).interval,
  };
}
