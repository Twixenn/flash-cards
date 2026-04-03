import { useState, useRef } from 'react';
import { api } from '../api';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

type Tab = 'manual' | 'paste';

function parseCards(text: string, sep: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l.includes(sep))
    .map((l) => {
      const parts = l.split(sep);
      return { front: parts[0]?.trim() || '', back: parts[1]?.trim() || '', notes: parts[2]?.trim() || '' };
    })
    .filter((c) => c.front);
}

export function AddDeckModal({ onClose, onCreated }: Props) {
  const [tab, setTab] = useState<Tab>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  async function save() {
    setError('');
    const nameEl  = document.getElementById(tab === 'manual' ? 'deckName' : 'deckNamePaste') as HTMLInputElement;
    const textEl  = document.getElementById(tab === 'manual' ? 'manualCards' : 'pasteCards') as HTMLTextAreaElement;
    const name    = nameEl?.value.trim();
    const rawText = textEl?.value.trim();
    const sep     = tab === 'manual' ? '|' : '\t';

    if (!name) { setError('Ange ett namn på decket.'); return; }
    if (!rawText) { setError('Inga kort att spara.'); return; }

    const cards = parseCards(rawText, sep);
    if (cards.length === 0) { setError('Hittade inga kort. Kontrollera formatet.'); return; }

    setLoading(true);
    try {
      const deck = await api.createDeck(name);
      await api.addCards(deck.id, cards);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  }

  const tabCls = (t: Tab) =>
    `flex-1 py-2 rounded-lg text-xs cursor-pointer transition-colors border-none ${
      tab === t ? 'bg-surface text-text' : 'bg-transparent text-muted'
    }`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="animate-slide-up bg-surface border border-border rounded-t-3xl px-6 pt-7 pb-10 w-full max-w-lg flex flex-col gap-4">
        <div className="font-serif text-2xl">Nytt deck</div>

        <div className="flex bg-bg rounded-xl p-1 gap-1">
          <button className={tabCls('manual')} onClick={() => setTab('manual')}>Manuellt</button>
          <button className={tabCls('paste')}  onClick={() => setTab('paste')}>Klistra in text</button>
        </div>

        {tab === 'manual' && (
          <div className="flex flex-col gap-3">
            <input type="text" id="deckName" placeholder="Deck-namn (t.ex. Hiragana)" />
            <div className="text-[0.7rem] text-muted leading-relaxed bg-bg border border-border rounded-xl px-4 py-3">
              Format: <code className="text-accent bg-accent/10 px-1 rounded">framsida | baksida</code> per rad.
            </div>
            <textarea id="manualCards" placeholder={'あ | a\nい | i\nう | u'} />
          </div>
        )}

        {tab === 'paste' && (
          <div className="flex flex-col gap-3">
            <input type="text" id="deckNamePaste" placeholder="Deck-namn" />
            <div className="text-[0.7rem] text-muted leading-relaxed bg-bg border border-border rounded-xl px-4 py-3">
              Tab-separerad text: <code className="text-accent bg-accent/10 px-1 rounded">framsida[TAB]baksida</code> per rad.
            </div>
            <textarea id="pasteCards" placeholder={'あ\ta\nい\ti'} />
          </div>
        )}

        {error && <div className="text-again text-sm">{error}</div>}

        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-2xl border border-border bg-surface text-text text-sm cursor-pointer hover:border-accent transition-colors"
            onClick={onClose} disabled={loading}
          >
            Avbryt
          </button>
          <button
            className="flex-1 py-3 rounded-2xl bg-accent text-bg font-medium text-sm cursor-pointer hover:bg-accent/90 transition-colors disabled:opacity-50"
            onClick={save} disabled={loading}
          >
            {loading ? 'Sparar...' : 'Spara deck'}
          </button>
        </div>
      </div>
    </div>
  );
}
