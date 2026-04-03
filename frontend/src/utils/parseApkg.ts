import JSZip from 'jszip';
import initSqlJs from 'sql.js';

export interface ParsedCard {
  front: string;
  back: string;
  notes: string;
}

export interface ParsedDeck {
  deckName: string;
  cards: ParsedCard[];
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

export async function parseApkg(file: File): Promise<ParsedDeck> {
  // 1. Extract ZIP
  const zip = await JSZip.loadAsync(file);

  // 2. Get collection.anki2
  const dbEntry = zip.file('collection.anki2') ?? zip.file('collection.anki21');
  if (!dbEntry) throw new Error('Ogiltig .apkg-fil: saknar collection.anki2');

  const dbBuffer = await dbEntry.async('arraybuffer');

  // 3. Open SQLite with sql.js (WASM loaded from /sql-wasm.wasm)
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });
  const db = new SQL.Database(new Uint8Array(dbBuffer));

  // 4. Get deck name from Anki collection metadata
  let deckName = file.name.replace(/\.apkg$/i, '').replace(/_/g, ' ');
  try {
    const colResult = db.exec('SELECT decks FROM col LIMIT 1');
    if (colResult.length > 0 && colResult[0].values.length > 0) {
      const decksJson = JSON.parse(colResult[0].values[0][0] as string);
      const names = Object.values(decksJson)
        .map((d: unknown) => (d as { name: string }).name)
        .filter((n) => n !== 'Default');
      if (names.length > 0) deckName = names[0];
    }
  } catch {
    // keep filename as deck name
  }

  // 5. Read notes — fields separated by \x1f (Anki's unit separator)
  const notesResult = db.exec('SELECT flds, tags FROM notes');
  db.close();

  const cards: ParsedCard[] = [];
  if (notesResult.length > 0) {
    for (const row of notesResult[0].values) {
      const flds = row[0] as string;
      const tags = (row[1] as string).trim();
      const fields = flds.split('\x1f');
      const front = stripHtml(fields[0] ?? '');
      const back = stripHtml(fields[1] ?? '');
      if (!front && !back) continue;
      cards.push({ front: front || '(empty)', back, notes: tags });
    }
  }

  if (cards.length === 0) throw new Error('Inga kort hittades i filen');

  return { deckName, cards };
}
