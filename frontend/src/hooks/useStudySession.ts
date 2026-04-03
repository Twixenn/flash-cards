import { useState, useCallback } from 'react';
import { api } from '../api';
import type { Card, Quality, SessionStats } from '../types';

interface StudySession {
  queue: Card[];
  index: number;
  stats: SessionStats;
  previews: Record<string, number>;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_PREVIEWS = { again: 1, hard: 3, good: 4, easy: 5 };

export function useStudySession() {
  const [session, setSession] = useState<StudySession>({
    queue: [],
    index: 0,
    stats: { again: 0, hard: 0, good: 0, easy: 0 },
    previews: EMPTY_PREVIEWS,
    isLoading: false,
    error: null,
  });

  const load = useCallback(async (deckId: number) => {
    setSession((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const cards = await api.getDueCards(deckId);
      setSession({
        queue: cards,
        index: 0,
        stats: { again: 0, hard: 0, good: 0, easy: 0 },
        previews: EMPTY_PREVIEWS,
        isLoading: false,
        error: null,
      });
      return cards.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load cards';
      setSession((s) => ({ ...s, isLoading: false, error: msg }));
      return 0;
    }
  }, []);

  const answer = useCallback(async (quality: Quality): Promise<boolean> => {
    const { queue, index } = session;
    const card = queue[index];
    if (!card) return false;

    const qualityName = (['again', 'hard', 'good', 'easy'] as const)[quality];

    setSession((s) => ({
      ...s,
      stats: { ...s.stats, [qualityName]: s.stats[qualityName] + 1 },
      index: s.index + 1,
    }));

    try {
      await api.reviewCard(card.id, quality);
    } catch {
      // non-fatal — card is still advanced in UI
    }

    const nextIndex = index + 1;
    return nextIndex >= queue.length;
  }, [session]);

  const currentCard = session.queue[session.index] ?? null;
  const isDone = session.index >= session.queue.length && session.queue.length > 0;
  const progress = session.queue.length > 0 ? session.index / session.queue.length : 0;

  return { session, currentCard, isDone, progress, load, answer };
}
