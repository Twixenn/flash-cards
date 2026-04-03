import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { importApkg, importTextFile } from '../services/apkg';

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.apkg', '.txt', '.csv', '.tsv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const deckNameOverride = (req.body.deckName as string | undefined)?.trim();

  try {
    let result;
    if (ext === '.apkg') {
      result = await importApkg(filePath, deckNameOverride);
    } else {
      const content = fs.readFileSync(filePath, 'utf-8');
      const deckName =
        deckNameOverride ||
        path.basename(req.file.originalname, ext).replace(/_/g, ' ');
      result = await importTextFile(content, deckName, ext === '.csv' ? ',' : '\t');
    }
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Import failed' });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

export default router;
