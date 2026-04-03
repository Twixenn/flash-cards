import type { SessionStats } from '../types';

interface Props {
  stats: SessionStats;
  onHome: () => void;
}

export function DoneScreen({ stats, onHome }: Props) {
  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="text-5xl">✦</div>
      <div className="font-serif text-4xl text-accent">Klart för idag!</div>

      <div className="flex gap-6 bg-surface border border-border rounded-2xl px-8 py-5">
        {([
          [stats.again, 'Again'],
          [stats.hard,  'Hard'],
          [stats.good,  'Good'],
          [stats.easy,  'Easy'],
        ] as [number, string][]).map(([n, label]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="font-serif text-4xl">{n}</div>
            <div className="text-[0.65rem] text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="text-muted text-sm leading-7">
        Bra jobbat. Kom tillbaka imorgon
        <br />
        för nästa repetition.
      </div>

      <button
        className="w-full max-w-xs py-4 rounded-2xl bg-accent text-bg font-medium text-sm cursor-pointer hover:bg-accent/90 transition-colors"
        onClick={onHome}
      >
        Tillbaka till decks
      </button>
    </div>
  );
}
