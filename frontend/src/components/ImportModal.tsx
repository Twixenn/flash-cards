interface Props {
  lines: string[];
  done: boolean;
  cardCount?: number;
  error?: string;
  onClose: () => void;
}

export function ImportModal({ lines, done, cardCount, error, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-8">
      <div className="w-full max-w-sm bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            {!done && !error && (
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            {done && !error && <div className="text-accent text-lg">✓</div>}
            {error && <div className="text-again text-lg">✕</div>}
            <div className="font-serif text-lg text-text">
              {error ? 'Import misslyckades' : done ? 'Import klar!' : 'Importerar...'}
            </div>
          </div>
          {done && !error && cardCount !== undefined && (
            <div className="text-muted text-xs mt-1 pl-7">
              {cardCount} kort importerade
            </div>
          )}
        </div>

        {/* Step log */}
        <div className="px-6 py-4 flex flex-col gap-2 max-h-56 overflow-y-auto">
          {lines.map((line, i) => {
            const isCurrent = !done && !error && i === lines.length - 1;
            const isPast = done || error || i < lines.length - 1;
            return (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <span className={`mt-px shrink-0 ${isPast ? 'text-accent' : 'text-muted'}`}>
                  {isPast ? '✓' : '·'}
                </span>
                <span className={isCurrent ? 'text-text' : 'text-muted'}>{line}</span>
              </div>
            );
          })}
          {error && (
            <div className="flex items-start gap-2.5 text-xs">
              <span className="text-again mt-px shrink-0">✕</span>
              <span className="text-again">{error}</span>
            </div>
          )}
        </div>

        {/* Close button — only when finished */}
        {(done || error) && (
          <div className="px-6 pb-6">
            <button
              className="w-full py-3 rounded-2xl bg-accent text-bg text-sm font-medium cursor-pointer hover:bg-accent/90 transition-colors"
              onClick={onClose}
            >
              {error ? 'Stäng' : 'Bra!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
