import { describe, it, expect } from 'vitest';
import { applyReview, previewIntervals } from '../../../backend/src/services/srs';

const newCard = { interval: 1, ease_factor: 2.5, repetitions: 0 };

describe('applyReview', () => {
  it('Again (0): resets interval to 1 and repetitions to 0', () => {
    const result = applyReview({ interval: 10, ease_factor: 2.5, repetitions: 5 }, 0);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it('Good (2) on first rep: sets interval to 1', () => {
    const result = applyReview(newCard, 2);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('Good (2) on second rep: sets interval to 3', () => {
    const card = { interval: 1, ease_factor: 2.5, repetitions: 1 };
    const result = applyReview(card, 2);
    expect(result.interval).toBe(3);
    expect(result.repetitions).toBe(2);
  });

  it('Easy (3) on second rep: sets interval to 5 (4 * 1.3 rounded)', () => {
    const card = { interval: 1, ease_factor: 2.5, repetitions: 1 };
    const result = applyReview(card, 3);
    expect(result.interval).toBe(5); // base=4 for easy rep2, then * 1.3 = 5.2 → 5
    expect(result.repetitions).toBe(2);
  });

  it('Hard (1): reduces interval by 1 (min 1)', () => {
    const card = { interval: 3, ease_factor: 2.5, repetitions: 1 };
    const result = applyReview(card, 1);
    // rep 2 → interval = 3 (good), then hard -1 = 2
    expect(result.interval).toBe(2);
  });

  it('Hard (1): never goes below interval 1', () => {
    const result = applyReview(newCard, 1);
    expect(result.interval).toBeGreaterThanOrEqual(1);
  });

  it('Easy (3): applies 1.3x bonus on top of normal interval', () => {
    const card = { interval: 10, ease_factor: 2.5, repetitions: 5 };
    const goodResult = applyReview(card, 2);
    const easyResult = applyReview(card, 3);
    expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
  });

  it('ease_factor never drops below 1.3', () => {
    const card = { interval: 1, ease_factor: 1.31, repetitions: 3 };
    const hard = applyReview(card, 1);
    expect(hard.ease_factor).toBeGreaterThanOrEqual(1.3);
  });

  it('due is set in the future', () => {
    const before = Math.floor(Date.now() / 1000);
    const result = applyReview(newCard, 2);
    expect(result.due).toBeGreaterThan(before);
  });
});

describe('previewIntervals', () => {
  it('returns intervals for all four qualities', () => {
    const preview = previewIntervals(newCard);
    expect(preview).toHaveProperty('again');
    expect(preview).toHaveProperty('hard');
    expect(preview).toHaveProperty('good');
    expect(preview).toHaveProperty('easy');
  });

  it('again interval is always 1', () => {
    const preview = previewIntervals({ interval: 20, ease_factor: 2.5, repetitions: 10 });
    expect(preview.again).toBe(1);
  });

  it('easy interval >= good interval >= hard interval', () => {
    const card = { interval: 10, ease_factor: 2.5, repetitions: 5 };
    const preview = previewIntervals(card);
    expect(preview.easy).toBeGreaterThanOrEqual(preview.good);
    expect(preview.good).toBeGreaterThanOrEqual(preview.hard);
  });
});
