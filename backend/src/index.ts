import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { MEDIA_DIR } from './db';
import decksRouter from './routes/decks';
import cardsRouter from './routes/cards';
import importRouter from './routes/import';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/decks', decksRouter);
app.use('/api/cards', cardsRouter);
// cards/due is nested under decks, re-use cardsRouter
app.use('/api', cardsRouter);
app.use('/api/import', importRouter);

// Media files
app.get('/api/media/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(MEDIA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }
  res.sendFile(filePath);
});

// Serve frontend (built by Vite into backend/public)
const STATIC_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kard server running on http://0.0.0.0:${PORT}`);
});
