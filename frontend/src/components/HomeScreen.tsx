import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Deck } from '../types';
import { AddDeckModal } from './AddDeckModal';
import { parseApkg } from '../utils/parseApkg';

interface Props {
  onStudy: (deck: Deck) => void;
  onLearn: (deck: Deck) => void;
}

export function HomeScreen({ onStudy, onLearn }: Props) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  async function loadDecks() {
    try { setDecks(await api.getDecks()); } catch { /* silent */ }
  }

  useEffect(() => { loadDecks(); }, []);

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError('');
    setImporting(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'apkg') {
        const { deckName, cards } = await parseApkg(file);
        const deck = await api.createDeck(deckName);
        await api.addCards(deck.id, cards);
        alert(`Importerat "${deckName}" med ${cards.length} kort!`);
      } else {
        const result = await api.importFile(file);
        alert(`Importerat "${result.deckName}" med ${result.cardCount} kort!`);
      }
      loadDecks();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import misslyckades');
    } finally {
      setImporting(false);
    }
  }

  async function deleteDeck(deck: Deck) {
    if (!confirm(`Ta bort "${deck.name}"? Alla kort raderas.`)) return;
    try { await api.deleteDeck(deck.id); loadDecks(); } catch { /* silent */ }
  }

  const btnBase = 'py-3 rounded-2xl border border-border bg-surface text-sm cursor-pointer hover:border-accent transition-colors font-mono text-text';

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col px-6 pt-12 pb-8 gap-8">
      {/* Logo */}
      <div>
        <div className="font-serif text-5xl text-accent -tracking-wide">
          Kard
          <span className="block italic opacity-60 text-base tracking-normal -mt-1">flashcards</span>
        </div>
      </div>

      {/* Deck list */}
      <div className="flex flex-col gap-3 flex-1">
        {decks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted text-sm text-center">
            <div className="text-4xl">☁️</div>
            <div>Inga decks än.<br />Skapa ett eller importera från Anki.</div>
          </div>
        ) : (
          decks.map((deck) => (
            <div key={deck.id} className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
              {/* Header row */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif text-xl text-text">{deck.name}</div>
                  <div className="text-xs text-muted mt-0.5">{deck.total} kort</div>
                </div>
                <button
                  className="text-again border border-again rounded-xl px-2.5 py-1 text-xs cursor-pointer hover:bg-again/10 transition-colors bg-transparent font-mono"
                  onClick={() => deleteDeck(deck)}
                >
                  ✕
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  className={`${btnBase} flex-1`}
                  onClick={() => onLearn(deck)}
                >
                  Lär dig
                </button>
                <button
                  className={`flex-1 py-3 rounded-2xl text-sm cursor-pointer font-medium transition-colors ${
                    deck.due > 0
                      ? 'bg-accent text-bg hover:bg-accent/90'
                      : 'bg-border text-muted cursor-default'
                  }`}
                  onClick={() => deck.due > 0 && onStudy(deck)}
                  disabled={deck.due === 0}
                >
                  Repetera {deck.due > 0 && <span className="opacity-70">({deck.due})</span>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {importError && (
        <div className="text-again text-xs px-1">{importError}</div>
      )}

      {/* Bottom bar */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <button className={`${btnBase} flex-1`} onClick={() => setShowModal(true)}>
          + Nytt deck
        </button>
        <label
          className={`flex-1 py-3 rounded-2xl text-sm font-medium text-center transition-colors cursor-pointer ${
            importing
              ? 'bg-accent/50 text-bg/50 cursor-not-allowed'
              : 'bg-accent text-bg hover:bg-accent/90'
          }`}
        >
          {importing ? 'Importerar...' : 'Importera .apkg'}
          <input
            type="file"
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
            onChange={handleFileImport}
            disabled={importing}
          />
        </label>
      </div>

      {showModal && (
        <AddDeckModal onClose={() => setShowModal(false)} onCreated={loadDecks} />
      )}
    </div>
  );
}
