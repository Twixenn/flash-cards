import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { Deck } from '../types';
import { AddDeckModal } from './AddDeckModal';

interface Props {
  onStudy: (deck: Deck) => void;
}

export function HomeScreen({ onStudy }: Props) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDecks() {
    try {
      const data = await api.getDecks();
      setDecks(data);
    } catch {
      // silent
    }
  }

  useEffect(() => { loadDecks(); }, []);

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError('');
    setImporting(true);
    try {
      const result = await api.importFile(file);
      alert(`Importerat "${result.deckName}" med ${result.cardCount} kort!`);
      loadDecks();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import misslyckades');
    } finally {
      setImporting(false);
    }
  }

  async function deleteDeck(deck: Deck) {
    if (!confirm(`Ta bort decket "${deck.name}"? Alla kort raderas.`)) return;
    try {
      await api.deleteDeck(deck.id);
      loadDecks();
    } catch {
      // silent
    }
  }

  function handleDeckClick(deck: Deck) {
    if (deck.due === 0) {
      alert(`Inga kort att repetera i "${deck.name}" idag! 🎉`);
      return;
    }
    onStudy(deck);
  }

  return (
    <div id="home" className="screen active">
      <div>
        <div className="logo">
          Kard<span>flashcards</span>
        </div>
      </div>

      <div className="decks-list">
        {decks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">☁️</div>
            <div>
              Inga decks än.
              <br />
              Skapa ett eller importera från Anki.
            </div>
          </div>
        ) : (
          decks.map((deck) => (
            <div key={deck.id} className="deck-card" onClick={() => handleDeckClick(deck)}>
              <div>
                <div className="deck-name">{deck.name}</div>
                <div className="deck-meta">{deck.total} kort</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`deck-due${deck.due === 0 ? ' zero' : ''}`}>
                  {deck.due}
                </div>
                <button
                  className="btn danger"
                  style={{ flex: 'none', padding: '6px 10px', fontSize: '0.7rem' }}
                  onClick={(e) => { e.stopPropagation(); deleteDeck(deck); }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {importError && (
        <div style={{ color: 'var(--again)', fontSize: '0.8rem', padding: '0 4px' }}>
          {importError}
        </div>
      )}

      <div className="bottom-bar">
        <button className="btn" onClick={() => setShowModal(true)}>
          + Nytt deck
        </button>
        <button
          className="btn primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importerar...' : 'Importera .apkg'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".apkg,.txt,.csv,.tsv,application/zip,*/*"
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
      </div>

      {showModal && (
        <AddDeckModal onClose={() => setShowModal(false)} onCreated={loadDecks} />
      )}
    </div>
  );
}
