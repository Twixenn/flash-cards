import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

export const MEDIA_DIR = path.join(__dirname, '..', 'media');
fs.mkdirSync(MEDIA_DIR, { recursive: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

const HIRAGANA: [string, string][] = [
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

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS decks (
      id         SERIAL PRIMARY KEY,
      name       TEXT    NOT NULL,
      created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );

    CREATE TABLE IF NOT EXISTS cards (
      id          SERIAL  PRIMARY KEY,
      deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      front       TEXT    NOT NULL,
      back        TEXT    NOT NULL DEFAULT '',
      notes       TEXT             DEFAULT '',
      audio       TEXT             DEFAULT '',
      image       TEXT             DEFAULT '',
      due         INTEGER          DEFAULT 0,
      interval    INTEGER          DEFAULT 1,
      ease_factor REAL             DEFAULT 2.5,
      repetitions INTEGER          DEFAULT 0,
      created_at  INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );
  `);

  // Seed Hiragana deck on first run
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM decks');
  if (rows[0].c === 0) {
    const deck = await pool.query(
      'INSERT INTO decks (name) VALUES ($1) RETURNING id',
      ['Hiragana']
    );
    const deckId = deck.rows[0].id;
    for (const [front, back] of HIRAGANA) {
      await pool.query(
        'INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3)',
        [deckId, front, back]
      );
    }
  }
}
