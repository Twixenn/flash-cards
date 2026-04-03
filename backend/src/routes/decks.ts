import { Router } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/decks
router.get('/', (_req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const decks = db
    .prepare(
      `SELECT d.id, d.name, d.created_at,
        COUNT(c.id) as total,
        SUM(CASE WHEN c.due <= ? THEN 1 ELSE 0 END) as due
       FROM decks d
       LEFT JOIN cards c ON c.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    )
    .all(now);
  res.json(decks);
});

// POST /api/decks
router.post('/', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const result = db.prepare('INSERT INTO decks (name) VALUES (?)').run(name.trim());
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(deck);
});

// DELETE /api/decks/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM decks WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }
  res.json({ ok: true });
});

// POST /api/decks/:id/cards — add cards to existing deck
router.post('/:id/cards', (req, res) => {
  const { id } = req.params;
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(id);
  if (!deck) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }

  const { cards } = req.body as { cards?: { front: string; back: string; notes?: string }[] };
  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: 'cards array required' });
    return;
  }

  const insert = db.prepare(
    'INSERT INTO cards (deck_id, front, back, notes) VALUES (?, ?, ?, ?)'
  );
  const insertMany = db.transaction(
    (cards: { front: string; back: string; notes?: string }[]) => {
      for (const c of cards) {
        if (c.front?.trim()) {
          insert.run(Number(id), c.front.trim(), c.back?.trim() || '', c.notes?.trim() || '');
        }
      }
    }
  );
  insertMany(cards);
  res.status(201).json({ ok: true, count: cards.length });
});

export default router;
