import { api } from '../api';
import type { Card } from '../types';

interface Props {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
}

function intervalLabel(days: number): string {
  if (days <= 0) return '< 1 dag';
  if (days === 1) return '1 dag';
  if (days < 7) return `${days} dagar`;
  if (days < 30) return `${Math.round(days / 7)} v`;
  return `${Math.round(days / 30)} mån`;
}

export function FlashCard({ card, revealed, onReveal }: Props) {
  return (
    <div
      className={`flashcard${revealed ? ' revealed' : ''}`}
      onClick={!revealed ? onReveal : undefined}
    >
      <div className="card-tag">FRAMSIDA</div>

      {card.image && (
        <img
          src={api.mediaUrl(card.image)}
          alt=""
          style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'contain' }}
        />
      )}

      <div className="card-front-text">{card.front}</div>

      {card.audio && !revealed && (
        <audio src={api.mediaUrl(card.audio)} autoPlay controls style={{ width: '100%' }} />
      )}

      {revealed && (
        <div className="card-back show">
          <div className="card-tag">BAKSIDA</div>
          <div className="card-back-text">{card.back}</div>
          {card.notes && <div className="card-notes">{card.notes}</div>}
          {card.audio && (
            <audio src={api.mediaUrl(card.audio)} autoPlay controls style={{ width: '100%' }} />
          )}
        </div>
      )}

      {!revealed && <div className="tap-hint">tryck för att visa svar</div>}
    </div>
  );
}

export { intervalLabel };
