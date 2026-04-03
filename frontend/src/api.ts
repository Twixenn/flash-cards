import type { Card, Deck, Quality } from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getDecks: () => request<Deck[]>('/decks'),

  createDeck: (name: string) =>
    request<Deck>('/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),

  deleteDeck: (id: number) =>
    request<{ ok: boolean }>(`/decks/${id}`, { method: 'DELETE' }),

  addCards: (deckId: number, cards: { front: string; back: string; notes?: string; audio?: string; image?: string }[]) =>
    request<{ ok: boolean; count: number }>(`/decks/${deckId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards }),
    }),

  getDueCards: (deckId: number) => request<Card[]>(`/decks/${deckId}/cards/due`),

  getAllCards: (deckId: number) => request<Card[]>(`/decks/${deckId}/cards`),

  reviewCard: (cardId: number, quality: Quality) =>
    request<{ interval: number; due: number }>(`/cards/${cardId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    }),

  importFile: (file: File, deckName?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (deckName) form.append('deckName', deckName);
    return request<{ deckId: number; cardCount: number; deckName: string }>('/import', {
      method: 'POST',
      body: form,
    });
  },

  mediaUrl: (filename: string) => `${BASE}/media/${encodeURIComponent(filename)}`,
};
