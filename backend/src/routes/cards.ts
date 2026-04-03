import { Router } from 'express';
import { db } from '../db';
import { applyReview, previewIntervals, Quality } from '../services/srs';

const router = Router();

// GET /api/decks/:id/cards/due
router.get('/decks/:id/cards/due', (req, res) => {
  const { id } = req.params;
  const now = Math.floor(Date.now() / 1000);
  const cards = db
    .prepare(
      `SELECT * FROM cards WHERE deck_id = ? AND due <= ?
       ORDER BY due ASC`
    )
    .all(id, now);
  res.json(cards);
});

// POST /api/cards/:id/review  { quality: 0|1|2|3 }
router.post('/:id/review', (req, res) => {
  const { id } = req.params;
  const { quality } = req.body as { quality?: number };

  if (quality === undefined || ![0, 1, 2, 3].includes(quality)) {
    res.status(400).json({ error: 'quality must be 0, 1, 2, or 3' });
    return;
  }

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
    | {
        id: number;
        interval: number;
        ease_factor: number;
        repetitions: number;
      }
    | undefined;

  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const updated = applyReview(card, quality as Quality);
  db.prepare(
    `UPDATE cards
     SET interval = ?, ease_factor = ?, repetitions = ?, due = ?
     WHERE id = ?`
  ).run(updated.interval, updated.ease_factor, updated.repetitions, updated.due, id);

  const previews = previewIntervals(updated);
  res.json({ ...updated, previews });
});

// GET /api/cards/:id/preview — preview next intervals without committing
router.get('/:id/preview', (req, res) => {
  const { id } = req.params;
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
    | { interval: number; ease_factor: number; repetitions: number }
    | undefined;
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json(previewIntervals(card));
});

export default router;
