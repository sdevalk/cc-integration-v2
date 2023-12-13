import {Database} from './types.js';
import SQLite from 'better-sqlite3';
import {Kysely, SqliteDialect} from 'kysely';

const dialect = new SqliteDialect({
  database: async () => {
    const db = new SQLite('db.sqlite'); // TBD: make path configurable?
    db.pragma('journal_mode = WAL');
    return db;
  },
});

export const db = new Kysely<Database>({dialect});
