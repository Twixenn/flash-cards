import type { SessionStats } from '../types';

interface Props {
  stats: SessionStats;
  onHome: () => void;
}

export function DoneScreen({ stats, onHome }: Props) {
  return (
    <div id="done" className="screen active">
      <div className="done-icon">✦</div>
      <div className="done-title">Klart för idag!</div>
      <div className="done-stats">
        <div className="stat">
          <div className="stat-num">{stats.again}</div>
          <div className="stat-label">Again</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.hard}</div>
          <div className="stat-label">Hard</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.good}</div>
          <div className="stat-label">Good</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.easy}</div>
          <div className="stat-label">Easy</div>
        </div>
      </div>
      <div className="done-sub">
        Bra jobbat. Kom tillbaka imorgon
        <br />
        för nästa repetition.
      </div>
      <button
        className="btn primary"
        style={{ width: '100%', maxWidth: 280 }}
        onClick={onHome}
      >
        Tillbaka till decks
      </button>
    </div>
  );
}
