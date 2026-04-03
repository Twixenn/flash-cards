import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEDIA_DIR = path.join(__dirname, '..', 'media');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'kard.db');

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS decks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS cards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front       TEXT NOT NULL,
    back        TEXT NOT NULL,
    notes       TEXT    DEFAULT '',
    audio       TEXT    DEFAULT '',
    image       TEXT    DEFAULT '',
    due         INTEGER DEFAULT 0,
    interval    INTEGER DEFAULT 1,
    ease_factor REAL    DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch())
  );
`);

export { MEDIA_DIR };

// Seed Hiragana deck on first run
const deckCount = (db.prepare('SELECT COUNT(*) as c FROM decks').get() as { c: number }).c;
if (deckCount === 0) {
  const hiragana: [string, string][] = [
    ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
    ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
    ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
    ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
    ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
    ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
    ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
    ['や','ya'],['ゆ','yu'],['よ','yo'],
    ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
    ['わ','wa'],['を','wo'],['ん','n'],
  ];
  const deck = db.prepare('INSERT INTO decks (name) VALUES (?)').run('Hiragana');
  const insertCard = db.prepare('INSERT INTO cards (deck_id, front, back) VALUES (?, ?, ?)');
  const seed = db.transaction(() => {
    for (const [front, back] of hiragana) insertCard.run(deck.lastInsertRowid, front, back);
  });
  seed();
}
