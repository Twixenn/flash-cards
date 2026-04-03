import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { db, MEDIA_DIR } from '../db';

interface AnkiNote {
  id: number;
  flds: string;
  tags: string;
}

interface ImportResult {
  deckId: number;
  cardCount: number;
  deckName: string;
}

export function importApkg(filePath: string, deckNameOverride?: string): ImportResult {
  const zip = new AdmZip(filePath);
  const tmpDir = path.join(path.dirname(filePath), `_apkg_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    zip.extractAllTo(tmpDir, true);

    // Read the Anki collection SQLite
    const ankiDbPath = path.join(tmpDir, 'collection.anki2');
    if (!fs.existsSync(ankiDbPath)) {
      throw new Error('Invalid .apkg file: missing collection.anki2');
    }

    const ankiDb = new Database(ankiDbPath, { readonly: true });

    // Get deck name from Anki collection
    let deckName = deckNameOverride || 'Imported Deck';
    try {
      const colRow = ankiDb.prepare('SELECT decks FROM col LIMIT 1').get() as { decks: string } | undefined;
      if (colRow?.decks) {
        const decksJson = JSON.parse(colRow.decks);
        const deckNames = Object.values(decksJson)
          .map((d: unknown) => (d as { name: string }).name)
          .filter((n) => n !== 'Default');
        if (deckNames.length > 0) deckName = deckNameOverride || deckNames[0];
      }
    } catch {
      // fallback to override or default
    }

    // Read notes — fields are separated by \x1f (unit separator)
    const notes = ankiDb.prepare('SELECT id, flds, tags FROM notes').all() as AnkiNote[];

    // Read media mapping: { "0": "audio.mp3", "1": "image.jpg" }
    let mediaMap: Record<string, string> = {};
    const mediaFile = path.join(tmpDir, 'media');
    if (fs.existsSync(mediaFile)) {
      try {
        mediaMap = JSON.parse(fs.readFileSync(mediaFile, 'utf-8'));
      } catch {
        // no media
      }
    }

    // Copy media files to our media dir
    for (const [key, originalName] of Object.entries(mediaMap)) {
      const src = path.join(tmpDir, key);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(MEDIA_DIR, originalName));
      }
    }

    ankiDb.close();

    // Insert into our DB
    const insertDeck = db.prepare('INSERT INTO decks (name) VALUES (?)');
    const deckResult = insertDeck.run(deckName);
    const deckId = deckResult.lastInsertRowid as number;

    const insertCard = db.prepare(`
      INSERT INTO cards (deck_id, front, back, notes, audio, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((notes: AnkiNote[]) => {
      let count = 0;
      for (const note of notes) {
        const fields = note.flds.split('\x1f');
        const front = stripHtml(fields[0] || '').trim();
        const back = stripHtml(fields[1] || '').trim();
        if (!front && !back) continue;

        // Detect media references in original fields
        const audio = extractMediaRef(fields.join('\x1f'), mediaMap, 'audio');
        const image = extractMediaRef(fields.join('\x1f'), mediaMap, 'image');

        insertCard.run(deckId, front || '(empty)', back, note.tags.trim(), audio, image);
        count++;
      }
      return count;
    });

    const cardCount = insertMany(notes);
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
  const audioExts = ['.mp3', '.ogg', '.wav', '.m4a', '.flac'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const exts = type === 'audio' ? audioExts : imageExts;

  // Look for [sound:xxx] pattern (Anki audio)
  if (type === 'audio') {
    const m = flds.match(/\[sound:([^\]]+)\]/);
    if (m) return m[1];
  }

  // Look for <img src="xxx"> pattern
  if (type === 'image') {
    const m = flds.match(/<img[^>]+src="([^"]+)"/i);
    if (m) return m[1];
  }

  // Fallback: scan media map for matching extension
  for (const originalName of Object.values(mediaMap)) {
    const ext = path.extname(originalName).toLowerCase();
    if (exts.includes(ext)) return originalName;
  }

  return '';
}

export function importTextFile(
  content: string,
  deckName: string,
  separator: string = '\t'
): ImportResult {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes(separator));

  if (lines.length === 0) throw new Error('No cards found in file');

  const insertDeck = db.prepare('INSERT INTO decks (name) VALUES (?)');
  const deckResult = insertDeck.run(deckName);
  const deckId = deckResult.lastInsertRowid as number;

  const insertCard = db.prepare(
    'INSERT INTO cards (deck_id, front, back, notes) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((lines: string[]) => {
    let count = 0;
    for (const line of lines) {
      const parts = line.split(separator);
      const front = parts[0]?.trim() || '';
      const back = parts[1]?.trim() || '';
      const notes = parts[2]?.trim() || '';
      if (!front) continue;
      insertCard.run(deckId, front, back, notes);
      count++;
    }
    return count;
  });

  const cardCount = insertMany(lines);
  return { deckId, cardCount, deckName };
}
