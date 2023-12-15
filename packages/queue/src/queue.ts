import {Database, NewItem} from './types.js';
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

export const getAllOptionsSchema = z
  .object({
    limit: z.number().int().min(1).optional(),
  })
  .default({});

export type GetAllOptions = z.input<typeof getAllOptionsSchema>;

export class Queue {
  private readonly db: Kysely<Database>;

  private constructor(options: ConstructorOptions) {
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

  private async runMigrations() {
    const dirname = fileURLToPath(new URL('.', import.meta.url));
    const migrationFolder = path.join(dirname, 'migrations');
    const provider = new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    });

    const migrator = new Migrator({db: this.db, provider});
    const {error} = await migrator.migrateToLatest();

    if (error) {
      throw error;
    }
  }

  static async new(options: ConstructorOptions) {
    const queue = new Queue(options);
    await queue.runMigrations();

    return queue;
  }

  async push(item: NewItem) {
    return this.db
      .insertInto('queue')
      .values(item)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: number) {
    await this.db.deleteFrom('queue').where('id', '=', id).execute();
  }

  async getAll(options?: GetAllOptions) {
    const opts = getAllOptionsSchema.parse(options);

    let query = this.db
      .selectFrom('queue')
      .orderBy('created_at asc') // FIFO
      .selectAll();

    if (opts.limit !== undefined) {
      query = query.limit(opts.limit);
    }

    return query.execute();
  }

  async isEmpty() {
    const record = await this.db
      .selectFrom('queue')
      .select(eb => eb.fn.count<number>('id').as('count'))
      .executeTakeFirstOrThrow();

    return record.count === 0;
  }
}
