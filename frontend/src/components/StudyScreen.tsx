import { useState, useEffect } from 'react';
import { FlashCard, intervalLabel } from './FlashCard';
import { useStudySession } from '../hooks/useStudySession';
import type { Deck, Quality } from '../types';

interface Props {
  deck: Deck;
  onDone: (stats: { again: number; hard: number; good: number; easy: number }) => void;
  onBack: () => void;
}

export function StudyScreen({ deck, onDone, onBack }: Props) {
  const { session, currentCard, isDone, progress, load, answer } = useStudySession();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    load(deck.id).then((count) => {
      if (count === 0) { alert(`Inga kort att repetera i "${deck.name}" idag! 🎉`); onBack(); }
    });
  }, [deck.id]);

  useEffect(() => { if (isDone) onDone(session.stats); }, [isDone]);
  useEffect(() => { setRevealed(false); }, [session.index]);

  const total = session.queue.length;
  const index = session.index;

  function previewDays(quality: Quality): number {
    if (!currentCard) return 1;
    let { interval: iv, ease_factor: ef, repetitions: reps } = currentCard;
    if (quality === 0) { iv = 1; reps = 0; }
    else {
      reps++;
      if (reps === 1) iv = 1;
      else if (reps === 2) iv = quality === 3 ? 4 : 3;
      else iv = Math.round(iv * ef);
      if (quality === 1) iv = Math.max(1, iv - 1);
      if (quality === 3) iv = Math.round(iv * 1.3);
    }
    return iv;
  }

  if (session.isLoading || !currentCard) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5">
          <button className="text-muted text-sm bg-transparent border-none cursor-pointer hover:text-text" onClick={onBack}>← tillbaka</button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Laddar...</div>
      </div>
    );
  }

  const ansBtnBase = 'py-4 px-2 rounded-2xl border bg-transparent text-sm cursor-pointer font-mono flex flex-col items-center gap-1 active:scale-[0.97] transition-all';

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <button className="text-muted text-sm bg-transparent border-none cursor-pointer hover:text-text font-mono" onClick={onBack}>← tillbaka</button>
        <span className="text-xs text-muted">{index + 1} / {total}</span>
      </div>

      <div className="h-0.5 bg-border mx-5 mt-4 rounded overflow-hidden">
        <div className="h-full bg-accent rounded transition-all duration-500" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-6">
        <FlashCard card={currentCard} revealed={revealed} onReveal={() => setRevealed(true)} />
      </div>

      {revealed && (
        <div className="grid grid-cols-2 gap-3 px-5 pb-8">
          <button className={`${ansBtnBase} text-again border-again hover:bg-again/10`} onClick={() => answer(0)}>
            Again<span className="text-[0.6rem] opacity-60">&lt;1 min</span>
          </button>
          <button className={`${ansBtnBase} text-hard border-hard hover:bg-hard/10`} onClick={() => answer(1)}>
            Hard<span className="text-[0.6rem] opacity-60">{intervalLabel(previewDays(1))}</span>
          </button>
          <button className={`${ansBtnBase} text-good border-good hover:bg-good/10`} onClick={() => answer(2)}>
            Good<span className="text-[0.6rem] opacity-60">{intervalLabel(previewDays(2))}</span>
          </button>
          <button className={`${ansBtnBase} text-easy border-easy hover:bg-easy/10`} onClick={() => answer(3)}>
            Easy<span className="text-[0.6rem] opacity-60">{intervalLabel(previewDays(3))}</span>
          </button>
        </div>
      )}
    </div>
  );
}
