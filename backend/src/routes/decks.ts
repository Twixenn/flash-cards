import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/decks
router.get('/', async (_req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.created_at,
       COUNT(c.id)::int                                          AS total,
       COUNT(c.id) FILTER (WHERE c.due <= $1)::int              AS due
     FROM decks d
     LEFT JOIN cards c ON c.deck_id = d.id
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [now]
  );
  res.json(rows);
});

// POST /api/decks
router.post('/', async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const { rows } = await pool.query(
    'INSERT INTO decks (name) VALUES ($1) RETURNING *',
    [name.trim()]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/decks/:id
router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM decks WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }
  res.json({ ok: true });
});

// POST /api/decks/:id/cards
router.post('/:id/cards', async (req, res) => {
  const deckId = req.params.id;
  const { rows: existing } = await pool.query(
    'SELECT id FROM decks WHERE id = $1',
    [deckId]
  );
  if (existing.length === 0) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }

  const { cards } = req.body as {
    cards?: { front: string; back: string; notes?: string; audio?: string; image?: string }[];
  };
  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: 'cards array required' });
    return;
  }

  for (const c of cards) {
    if (c.front?.trim()) {
      await pool.query(
        'INSERT INTO cards (deck_id, front, back, notes, audio, image) VALUES ($1, $2, $3, $4, $5, $6)',
        [deckId, c.front.trim(), c.back?.trim() || '', c.notes?.trim() || '', c.audio || '', c.image || '']
      );
    }
  }
  res.status(201).json({ ok: true, count: cards.length });
});

export default router;
