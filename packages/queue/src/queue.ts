import {Database, NewItem, ItemUpdate} from './types.js';
import SQLite from 'better-sqlite3';
import {FileMigrationProvider, Migrator, Kysely, SqliteDialect} from 'kysely';
import fs from 'node:fs/promises';
import path from 'node:path';
import {URL, fileURLToPath} from 'node:url';
import {z} from 'zod';

export const constructorOptionsSchema = z.object({
  path: z.string(),
});

export type ConstructorOptions = z.input<typeof constructorOptionsSchema>;

export class Queue {
  private db: Kysely<Database>;

  constructor(options: ConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    const dialect = new SqliteDialect({
      database: async () => {
        const db = new SQLite(opts.path);
        db.pragma('journal_mode = WAL');
        return db;
      },
    });

    this.db = new Kysely<Database>({dialect});
  }

  async init() {
    // Create the database if it doesn't exist and run the latest migrations
    const dirname = fileURLToPath(new URL('.', import.meta.url));
    const migrationFolder = path.join(dirname, 'migrations');
    const provider = new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    });

    const migrator = new Migrator({db: this.db, provider});
    const {error, results} = await migrator.migrateToLatest();

    results?.forEach(result => {
      if (result.status === 'Error') {
        console.error(`Failed to execute migration "${result.migrationName}"`);
      }
    });

    if (error) {
      console.error('Failed to migrate');
      console.error(error);
      throw error;
    }
  }

  async push(item: NewItem) {
    return this.db
      .insertInto('queue')
      .values(item)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: number, updateWith: ItemUpdate) {
    return this.db
      .updateTable('queue')
      .set(updateWith)
      .where('id', '=', id)
      .execute();
  }

  async remove(id: number) {
    return this.db
      .deleteFrom('queue')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async getPending(limit?: number) {
    const query = this.db
      .selectFrom('queue')
      .where('status', '=', 'pending')
      .selectAll();

    if (limit !== undefined) {
      query.limit(limit);
    }

    return query.execute();
  }

  async isEmpty() {
    const record = await this.db
      .selectFrom('queue')
      .where('status', '=', 'pending')
      .select(eb => eb.fn.count<number>('id').as('count'))
      .executeTakeFirstOrThrow();

    return record.count === 0;
  }
}
