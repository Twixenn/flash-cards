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
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.apkg', '.txt', '.csv', '.tsv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// POST /api/import
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
      result = importApkg(filePath, deckNameOverride);
    } else {
      // text/csv/tsv
      const content = fs.readFileSync(filePath, 'utf-8');
      const deckName =
        deckNameOverride ||
        path.basename(req.file.originalname, ext).replace(/_/g, ' ');
      const separator = ext === '.csv' ? ',' : '\t';
      result = importTextFile(content, deckName, separator);
    }

    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(500).json({ error: message });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

export default router;
