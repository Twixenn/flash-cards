export interface Deck {
  id: number;
  name: string;
  total: number;
  due: number;
  created_at: number;
}

export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  notes: string;
  audio: string;
  image: string;
  due: number;
  interval: number;
  ease_factor: number;
  repetitions: number;
}

export type Quality = 0 | 1 | 2 | 3;
export type Screen = 'home' | 'study' | 'done';

export interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface Previews {
  again: number;
  hard: number;
  good: number;
  easy: number;
}
