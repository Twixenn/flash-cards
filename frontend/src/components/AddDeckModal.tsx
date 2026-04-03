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
      return {
        front: parts[0]?.trim() || '',
        back: parts[1]?.trim() || '',
        notes: parts[2]?.trim() || '',
      };
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
    const nameEl = document.getElementById(
      tab === 'manual' ? 'deckName' : 'deckNamePaste'
    ) as HTMLInputElement;
    const textEl = document.getElementById(
      tab === 'manual' ? 'manualCards' : 'pasteCards'
    ) as HTMLTextAreaElement;

    const name = nameEl?.value.trim();
    const rawText = textEl?.value.trim();
    const sep = tab === 'manual' ? '|' : '\t';

    if (!name) { setError('Ange ett namn på decket.'); return; }
    if (!rawText) { setError('Inga kort att spara.'); return; }

    const cards = parseCards(rawText, sep);
    if (cards.length === 0) {
      setError('Hittade inga kort. Kontrollera formatet.');
      return;
    }

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

  return (
    <div
      className="modal-overlay show"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal">
        <div className="modal-title">Nytt deck</div>

        <div className="tabs">
          <button
            className={`tab${tab === 'manual' ? ' active' : ''}`}
            onClick={() => setTab('manual')}
          >
            Manuellt
          </button>
          <button
            className={`tab${tab === 'paste' ? ' active' : ''}`}
            onClick={() => setTab('paste')}
          >
            Klistra in text
          </button>
        </div>

        {tab === 'manual' && (
          <div className="tab-panel active">
            <input type="text" id="deckName" placeholder="Deck-namn (t.ex. Hiragana)" />
            <div className="modal-hint">
              Format: <code>framsida | baksida</code> per rad.
            </div>
            <textarea
              id="manualCards"
              placeholder={'あ | a\nい | i\nう | u'}
            />
          </div>
        )}

        {tab === 'paste' && (
          <div className="tab-panel active">
            <input type="text" id="deckNamePaste" placeholder="Deck-namn" />
            <div className="modal-hint">
              Klistra in Anki-exporterad text (Tab-separerad):{' '}
              <code>framsida[TAB]baksida</code> per rad.
              <br />
              <br />
              Exportera från Anki:{' '}
              <code>Arkiv → Exportera → Notes as Plain Text</code>
            </div>
            <textarea id="pasteCards" placeholder={'あ\ta\nい\ti'} />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--again)', fontSize: '0.8rem' }}>{error}</div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose} disabled={loading}>
            Avbryt
          </button>
          <button className="btn primary" onClick={save} disabled={loading}>
            {loading ? 'Sparar...' : 'Spara deck'}
          </button>
        </div>
      </div>
    </div>
  );
}
