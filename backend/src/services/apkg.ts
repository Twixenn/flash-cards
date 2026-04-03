import AdmZip from 'adm-zip';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { pool, MEDIA_DIR } from '../db';

interface ImportResult {
  deckId: number;
  cardCount: number;
  deckName: string;
}

export async function importApkg(
  filePath: string,
  deckNameOverride?: string
): Promise<ImportResult> {
  const zip = new AdmZip(filePath);
  const tmpDir = path.join(path.dirname(filePath), `_apkg_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    zip.extractAllTo(tmpDir, true);

    const ankiDbPath = path.join(tmpDir, 'collection.anki2');
    if (!fs.existsSync(ankiDbPath)) {
      throw new Error('Invalid .apkg file: missing collection.anki2');
    }

    // Use sql.js (pure JS) to read the Anki SQLite — no native build needed
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(ankiDbPath);
    const ankiDb = new SQL.Database(fileBuffer);

    // Get deck name from Anki collection
    let deckName = deckNameOverride || 'Imported Deck';
    try {
      const colResult = ankiDb.exec('SELECT decks FROM col LIMIT 1');
      if (colResult.length > 0 && colResult[0].values.length > 0) {
        const decksJson = JSON.parse(colResult[0].values[0][0] as string);
        const names = Object.values(decksJson)
          .map((d: unknown) => (d as { name: string }).name)
          .filter((n) => n !== 'Default');
        if (names.length > 0) deckName = deckNameOverride || names[0];
      }
    } catch {
      // keep default
    }

    // Read notes
    const notesResult = ankiDb.exec('SELECT id, flds, tags FROM notes');
    const notes =
      notesResult.length > 0
        ? notesResult[0].values.map((row) => ({
            id: row[0] as number,
            flds: row[1] as string,
            tags: row[2] as string,
          }))
        : [];

    // Read media map
    let mediaMap: Record<string, string> = {};
    const mediaFile = path.join(tmpDir, 'media');
    if (fs.existsSync(mediaFile)) {
      try {
        mediaMap = JSON.parse(fs.readFileSync(mediaFile, 'utf-8'));
      } catch {
        // no media
      }
    }

    ankiDb.close();

    // Copy media files
    for (const [key, originalName] of Object.entries(mediaMap)) {
      const src = path.join(tmpDir, key);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(MEDIA_DIR, originalName));
      }
    }

    // Insert deck
    const deckRes = await pool.query(
      'INSERT INTO decks (name) VALUES ($1) RETURNING id',
      [deckName]
    );
    const deckId: number = deckRes.rows[0].id;

    // Insert cards
    let cardCount = 0;
    for (const note of notes) {
      const fields = note.flds.split('\x1f');
      const front = stripHtml(fields[0] || '').trim();
      const back = stripHtml(fields[1] || '').trim();
      if (!front && !back) continue;

      const audio = extractMediaRef(note.flds, mediaMap, 'audio');
      const image = extractMediaRef(note.flds, mediaMap, 'image');

      await pool.query(
        'INSERT INTO cards (deck_id, front, back, notes, audio, image) VALUES ($1,$2,$3,$4,$5,$6)',
        [deckId, front || '(empty)', back, note.tags.trim(), audio, image]
      );
      cardCount++;
    }

    return { deckId, cardCount, deckName };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function extractMediaRef(
  flds: string,
  mediaMap: Record<string, string>,
  type: 'audio' | 'image'
): string {
  if (type === 'audio') {
    const m = flds.match(/\[sound:([^\]]+)\]/);
    if (m) return m[1];
  }
  if (type === 'image') {
    const m = flds.match(/<img[^>]+src="([^"]+)"/i);
    if (m) return m[1];
  }
  const exts =
    type === 'audio'
      ? ['.mp3', '.ogg', '.wav', '.m4a', '.flac']
      : ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  for (const name of Object.values(mediaMap)) {
    if (exts.includes(path.extname(name).toLowerCase())) return name;
  }
  return '';
}

export async function importTextFile(
  content: string,
  deckName: string,
  separator = '\t'
): Promise<ImportResult> {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes(separator));

  if (lines.length === 0) throw new Error('No cards found in file');

  const deckRes = await pool.query(
    'INSERT INTO decks (name) VALUES ($1) RETURNING id',
    [deckName]
  );
  const deckId: number = deckRes.rows[0].id;

  let cardCount = 0;
  for (const line of lines) {
    const parts = line.split(separator);
    const front = parts[0]?.trim() || '';
    const back = parts[1]?.trim() || '';
    const notes = parts[2]?.trim() || '';
    if (!front) continue;
    await pool.query(
      'INSERT INTO cards (deck_id, front, back, notes) VALUES ($1,$2,$3,$4)',
      [deckId, front, back, notes]
    );
    cardCount++;
  }

  return { deckId, cardCount, deckName };
}
