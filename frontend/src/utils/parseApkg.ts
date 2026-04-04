import JSZip from 'jszip';
import initSqlJs from 'sql.js';

export interface ParsedCard {
  front: string;
  back: string;
  notes: string;
  audio: string;
  image: string;
}

export interface ParsedDeck {
  deckName: string;
  cards: ParsedCard[];
}

// Convert raw bytes to a base64 data URL so media can be stored and displayed inline
function toDataUrl(bytes: Uint8Array, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  const mime = mimeMap[ext] ?? 'application/octet-stream';
  // Build base64 in chunks to avoid call-stack overflow on large files
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

// Extract the first [sound:filename] reference from a field value
function extractSoundFile(text: string): string | null {
  const m = text.match(/\[sound:([^\]]+)\]/);
  return m ? m[1] : null;
}

// Extract the first <img src="..."> filename from a field value
function extractImageFile(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// Strip Anki markup and return plain text for display
function cleanField(html: string): string {
  return html
    .replace(/\[sound:[^\]]+\]/g, '')  // remove [sound:...] tags
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')           // strip all HTML tags (incl. <img>)
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

export type ProgressFn = (message: string) => void;

export async function parseApkg(file: File, onProgress: ProgressFn = () => {}): Promise<ParsedDeck> {
  // 1. Extract ZIP
  onProgress('Öppnar fil...');
  const zip = await JSZip.loadAsync(file);

  // 2. Build media map: original filename → base64 data URL
  //    The ZIP contains a "media" JSON file: {"0": "image.jpg", "1": "audio.mp3", ...}
  //    and the actual files stored as "0", "1", etc.
  const mediaMap: Record<string, string> = {};
  const mediaEntry = zip.file('media');
  if (mediaEntry) {
    try {
      const mediaJson = JSON.parse(await mediaEntry.async('string')) as Record<string, string>;
      const mediaEntries = Object.entries(mediaJson);
      if (mediaEntries.length > 0) {
        onProgress(`Extraherar media (${mediaEntries.length} filer)...`);
        for (const [numericName, originalName] of mediaEntries) {
          const mediaFile = zip.file(numericName);
          if (mediaFile) {
            const bytes = await mediaFile.async('uint8array');
            mediaMap[originalName] = toDataUrl(bytes, originalName);
          }
        }
      }
    } catch {
      // Media extraction failed — continue without media
    }
  }

  // 3. Open SQLite with sql.js
  onProgress('Laddar databas...');
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });

  // Try each database format in order.
  // anki21b = Anki 2.1.50+ (new scheduler), anki21 = 2.1.36–2.1.49, anki2 = legacy.
  // Some formats may open but return 0 rows (e.g. anki21b with sql.js), so we pick
  // the first file that yields actual non-placeholder notes.
  const COMPAT_MSG = 'Please update to the latest Anki version';
  const candidates = ['collection.anki21b', 'collection.anki21', 'collection.anki2'];

  let notesRows: unknown[][] = [];
  let openedDb: InstanceType<(typeof SQL)['Database']> | null = null;

  for (const filename of candidates) {
    const entry = zip.file(filename);
    if (!entry) continue;

    onProgress(`Provar ${filename}...`);
    let buf: ArrayBuffer;
    try { buf = await entry.async('arraybuffer'); } catch { continue; }

    let db: InstanceType<(typeof SQL)['Database']>;
    try {
      db = new SQL.Database(new Uint8Array(buf));
    } catch {
      continue; // format not readable by sql.js, try next
    }

    try {
      const result = db.exec('SELECT flds, tags FROM notes');
      const rows = (result[0]?.values ?? []) as unknown[][];
      const real = rows.filter(
        (r) => !(r[0] as string).split('\x1f')[0].startsWith(COMPAT_MSG)
      );
      if (real.length > 0) {
        onProgress(`Hittade ${real.length} noter i ${filename}`);
        notesRows = real;
        openedDb = db;
        break;
      }
    } catch {
      // schema mismatch — try next
    }
    db.close();
  }

  if (!openedDb) {
    throw new Error(
      'Inga kort hittades. Kontrollera att filen är ett giltigt Anki-deck och försök exportera igen från Anki: ' +
      'Arkiv → Exportera → Anki Deck Package (.apkg).'
    );
  }

  // 4. Get deck name — try new format first (separate decks table), then col.decks JSON
  let deckName = file.name.replace(/\.apkg$/i, '').replace(/_/g, ' ');
  try {
    const r = openedDb.exec("SELECT name FROM decks WHERE id != 1 LIMIT 1");
    const name = r[0]?.values[0]?.[0] as string | undefined;
    if (name) deckName = name;
  } catch {
    try {
      const colResult = openedDb.exec('SELECT decks FROM col LIMIT 1');
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

  openedDb.close();

  // 5. Build cards from notes rows
  onProgress('Bearbetar kort...');
  const cards: ParsedCard[] = [];
  for (const row of notesRows) {
    const flds = row[0] as string;
    const tags = ((row[1] as string) ?? '').trim();
    const fields = flds.split('\x1f');

    const front = cleanField(fields[0] ?? '');
    const back = cleanField(fields[1] ?? '');

    // Extra fields (3rd onward) become notes, together with tags
    const extraFields = fields.slice(2).map(cleanField).filter(Boolean);
    const notes = [...extraFields, ...(tags ? [tags] : [])].join('\n').trim();

    if (!front && !back) continue;

    // Find audio and image across all fields
    let audio = '';
    let image = '';
    for (const field of fields) {
      if (!audio) {
        const soundFile = extractSoundFile(field);
        if (soundFile && mediaMap[soundFile]) audio = mediaMap[soundFile];
      }
      if (!image) {
        const imgFile = extractImageFile(field);
        if (imgFile && mediaMap[imgFile]) image = mediaMap[imgFile];
      }
      if (audio && image) break;
    }

    cards.push({ front: front || '(empty)', back, notes, audio, image });
  }

  if (cards.length === 0) throw new Error('Inga kort hittades i filen');

  return { deckName, cards };
}
