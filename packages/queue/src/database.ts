import {Database} from './types.js';
import SQLite from 'better-sqlite3';
import {Kysely, SqliteDialect} from 'kysely';
import {env} from 'node:process';

if (!env.DB_PATH) {
  throw new Error('Environment variable "DB_PATH" is invalid');
}

const dialect = new SqliteDialect({
  database: async () => {
    const db = new SQLite(env.DB_PATH as string);
    db.pragma('journal_mode = WAL');
    return db;
  },
});

export const db = new Kysely<Database>({dialect});
