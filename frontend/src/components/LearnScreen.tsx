import { useState, useEffect } from 'react';
import { api } from '../api';
import { FlashCard } from './FlashCard';
import type { Card, Deck } from '../types';

interface Props {
  deck: Deck;
  onBack: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function LearnScreen({ deck, onBack }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.getAllCards(deck.id).then((all) => {
      setCards(shuffle(all));
      setLoading(false);
    });
  }, [deck.id]);

  function handleCardClick() {
    if (!revealed) {
      setRevealed(true);
    } else {
      next();
    }
  }

  function next() {
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  const progress = cards.length > 0 ? index / cards.length : 0;
  const current = cards[index];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col">
        <div className="flex items-center px-5 pt-5">
          <button className="text-muted text-sm bg-transparent border-none cursor-pointer hover:text-text font-mono" onClick={onBack}>← tillbaka</button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Laddar...</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-5xl">✦</div>
        <div className="font-serif text-4xl text-accent">Klart!</div>
        <div className="text-muted text-sm leading-7">
          Du har gått igenom alla {cards.length} kort i
          <br />
          <span className="text-text">"{deck.name}"</span>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            className="flex-1 py-4 rounded-2xl border border-border bg-surface text-text text-sm cursor-pointer hover:border-accent transition-colors font-mono"
            onClick={() => { setIndex(0); setRevealed(false); setCards(shuffle(cards)); setDone(false); }}
          >
            Igen
          </button>
          <button
            className="flex-1 py-4 rounded-2xl bg-accent text-bg font-medium text-sm cursor-pointer hover:bg-accent/90 transition-colors"
            onClick={onBack}
          >
            Tillbaka
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <button className="text-muted text-sm bg-transparent border-none cursor-pointer hover:text-text font-mono" onClick={onBack}>← tillbaka</button>
        <span className="text-xs text-muted">{index + 1} / {cards.length}</span>
      </div>

      <div className="h-0.5 bg-border mx-5 mt-4 rounded overflow-hidden">
        <div className="h-full bg-accent rounded transition-all duration-500" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-6">
        <div className="w-full max-w-lg" onClick={handleCardClick}>
          <FlashCard
            card={current}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            hint="tryck för att visa svar"
          />
          {revealed && (
            <button
              className="mt-4 w-full py-4 rounded-2xl bg-accent text-bg font-medium text-sm cursor-pointer hover:bg-accent/90 transition-colors"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              Nästa →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
