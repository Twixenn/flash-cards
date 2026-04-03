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

  // 2. Find the collection database (anki2 = old, anki21 = new)
  const dbEntry = zip.file('collection.anki2') ?? zip.file('collection.anki21');
  if (!dbEntry) throw new Error('Ogiltig .apkg-fil: saknar collection.anki2');

  const dbBuffer = await dbEntry.async('arraybuffer');

  // 3. Open SQLite with sql.js
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });

  let db: InstanceType<(typeof SQL)['Database']>;
  try {
    db = new SQL.Database(new Uint8Array(dbBuffer));
  } catch {
    throw new Error(
      'Kunde inte öppna Anki-databasen. Filen kan vara skadad eller i ett format som appen inte stödjer.'
    );
  }

  // 4. Get deck name — try new format first (separate decks table, Anki 2.1.36+),
  //    then fall back to old format (col.decks JSON blob)
  let deckName = file.name.replace(/\.apkg$/i, '').replace(/_/g, ' ');
  try {
    const r = db.exec("SELECT name FROM decks WHERE id != 1 LIMIT 1");
    const name = r[0]?.values[0]?.[0] as string | undefined;
    if (name) deckName = name;
  } catch {
    // Old format: deck list embedded in col.decks as JSON
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
      // Keep filename as deck name
    }
  }

  // 5. Read notes — flds column uses \x1f (unit separator) between fields
  let notesResult: ReturnType<typeof db.exec>;
  try {
    notesResult = db.exec('SELECT flds, tags FROM notes');
  } catch {
    db.close();
    throw new Error(
      'Din Anki-fil verkar använda ett nyare format. ' +
      'Försök exportera decket igen från Anki: Arkiv → Exportera → Anki Deck Package (.apkg). ' +
      'Avmarkera "Support older Anki versions" om du inte ser alternativet.'
    );
  }

  db.close();

  const cards: ParsedCard[] = [];
  if (notesResult.length > 0) {
    for (const row of notesResult[0].values) {
      const flds = row[0] as string;
      const tags = ((row[1] as string) ?? '').trim();
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
