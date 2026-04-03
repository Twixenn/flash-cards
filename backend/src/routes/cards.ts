import { Router } from 'express';
import { pool } from '../db';
import { applyReview, previewIntervals, Quality } from '../services/srs';

const router = Router();

// GET /api/decks/:id/cards  (all cards, for learn mode)
router.get('/decks/:id/cards', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json(rows);
});

// GET /api/decks/:id/cards/due
router.get('/decks/:id/cards/due', async (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const { rows } = await pool.query(
    'SELECT * FROM cards WHERE deck_id = $1 AND due <= $2 ORDER BY due ASC',
    [req.params.id, now]
  );
  res.json(rows);
});

// POST /api/cards/:id/review  { quality: 0|1|2|3 }
router.post('/:id/review', async (req, res) => {
  const { quality } = req.body as { quality?: number };
  if (quality === undefined || ![0, 1, 2, 3].includes(quality)) {
    res.status(400).json({ error: 'quality must be 0, 1, 2, or 3' });
    return;
  }

  const { rows } = await pool.query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const card = rows[0];
  const updated = applyReview(
    {
      interval: card.interval,
      ease_factor: parseFloat(card.ease_factor),
      repetitions: card.repetitions,
    },
    quality as Quality
  );

  await pool.query(
    `UPDATE cards
     SET interval = $1, ease_factor = $2, repetitions = $3, due = $4
     WHERE id = $5`,
    [updated.interval, updated.ease_factor, updated.repetitions, updated.due, req.params.id]
  );

  res.json({ ...updated, previews: previewIntervals(updated) });
});

// GET /api/cards/:id/preview
router.get('/:id/preview', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  const c = rows[0];
  res.json(
    previewIntervals({
      interval: c.interval,
      ease_factor: parseFloat(c.ease_factor),
      repetitions: c.repetitions,
    })
  );
});

export default router;
