import { api } from '../api';
import type { Card } from '../types';

interface Props {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
  hint?: string;
}

export function intervalLabel(days: number): string {
  if (days <= 0) return '< 1 dag';
  if (days === 1) return '1 dag';
  if (days < 7) return `${days} dagar`;
  if (days < 30) return `${Math.round(days / 7)} v`;
  return `${Math.round(days / 30)} mån`;
}

export function FlashCard({ card, revealed, onReveal, hint = 'tryck för att visa svar' }: Props) {
  return (
    <div
      className={`card-glow w-full max-w-lg bg-surface border rounded-3xl px-7 py-10 text-center min-h-56 flex flex-col items-center justify-center gap-5 relative overflow-hidden transition-colors duration-200 ${
        revealed ? 'border-border cursor-default' : 'border-border hover:border-accent cursor-pointer active:scale-[0.99]'
      }`}
      onClick={!revealed ? onReveal : undefined}
    >
      <span className="text-[0.65rem] text-muted tracking-widest uppercase">framsida</span>

      {card.image && (
        <img
          src={api.mediaUrl(card.image)}
          alt=""
          className="max-w-full max-h-44 rounded-lg object-contain"
        />
      )}

      <div className="font-serif text-[clamp(2rem,8vw,3.5rem)] text-text leading-none break-words">
        {card.front}
      </div>

      {card.audio && !revealed && (
        <audio src={api.mediaUrl(card.audio)} autoPlay controls className="w-full" />
      )}

      {revealed && (
        <div className="flex flex-col items-center gap-3 border-t border-border pt-5 w-full">
          <span className="text-[0.65rem] text-muted tracking-widest uppercase">baksida</span>
          <div className="font-serif text-[clamp(1.2rem,5vw,2rem)] text-accent italic">
            {card.back}
          </div>
          {card.notes && (
            <div className="text-xs text-muted leading-relaxed">{card.notes}</div>
          )}
          {card.audio && (
            <audio src={api.mediaUrl(card.audio)} autoPlay controls className="w-full" />
          )}
        </div>
      )}

      {!revealed && (
        <span className="text-[0.7rem] text-muted tracking-wide -mt-2">{hint}</span>
      )}
    </div>
  );
}
