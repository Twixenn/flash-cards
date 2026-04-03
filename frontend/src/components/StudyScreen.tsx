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
      if (count === 0) {
        alert(`Inga kort att repetera i "${deck.name}" idag! 🎉`);
        onBack();
      }
    });
  }, [deck.id]);

  useEffect(() => {
    if (isDone) onDone(session.stats);
  }, [isDone]);

  useEffect(() => {
    setRevealed(false);
  }, [session.index]);

  async function handleAnswer(quality: Quality) {
    await answer(quality);
  }

  if (session.isLoading || !currentCard) {
    return (
      <div id="study" className="screen active">
        <div className="study-header">
          <button className="back-btn" onClick={onBack}>
            ← tillbaka
          </button>
        </div>
        <div className="card-area">
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Laddar...</div>
        </div>
      </div>
    );
  }

  const total = session.queue.length;
  const index = session.index;

  // Preview intervals for current card
  const { interval, ease_factor, repetitions } = currentCard;
  function previewDays(quality: Quality): number {
    let iv = interval;
    let ef = ease_factor;
    let reps = repetitions;
    if (quality === 0) {
      iv = 1; reps = 0;
    } else {
      reps++;
      if (reps === 1) iv = 1;
      else if (reps === 2) iv = quality === 3 ? 4 : 3;
      else iv = Math.round(iv * ef);
      if (quality === 1) iv = Math.max(1, iv - 1);
      if (quality === 3) iv = Math.round(iv * 1.3);
      ef = Math.max(1.3, ef + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
    }
    return iv;
  }

  return (
    <div id="study" className="screen active">
      <div className="study-header">
        <button className="back-btn" onClick={onBack}>
          ← tillbaka
        </button>
        <span className="study-count">
          {index + 1} / {total}
        </span>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="card-area">
        <FlashCard card={currentCard} revealed={revealed} onReveal={() => setRevealed(true)} />
      </div>

      <div className={`answer-btns${revealed ? '' : ' hidden'}`}>
        <button className="ans-btn again" onClick={() => handleAnswer(0)}>
          Again
          <span className="interval">&lt;1 min</span>
        </button>
        <button className="ans-btn hard" onClick={() => handleAnswer(1)}>
          Hard
          <span className="interval">{intervalLabel(previewDays(1))}</span>
        </button>
        <button className="ans-btn good" onClick={() => handleAnswer(2)}>
          Good
          <span className="interval">{intervalLabel(previewDays(2))}</span>
        </button>
        <button className="ans-btn easy" onClick={() => handleAnswer(3)}>
          Easy
          <span className="interval">{intervalLabel(previewDays(3))}</span>
        </button>
      </div>
    </div>
  );
}
