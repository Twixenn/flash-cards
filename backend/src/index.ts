import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDb, MEDIA_DIR } from './db';
import decksRouter from './routes/decks';
import cardsRouter from './routes/cards';
import importRouter from './routes/import';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/decks', decksRouter);
app.use('/api/cards', cardsRouter);
app.use('/api', cardsRouter);       // /api/decks/:id/cards/due
app.use('/api/import', importRouter);

app.get('/api/media/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(MEDIA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }
  res.sendFile(filePath);
});

const STATIC_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
}

initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Kard server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
