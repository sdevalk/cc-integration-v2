import {ESMFileMigrationProvider} from './provider.js';
import {Database, NewItem} from './types.js';
import SQLite from 'better-sqlite3';
import {Migrator, Kysely, SqliteDialect} from 'kysely';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {z} from 'zod';

export const constructorOptionsSchema = z.object({
  path: z.string(),
});

export type ConstructorOptions = z.input<typeof constructorOptionsSchema>;

const getAllOptionsSchema = z
  .object({
    limit: z.number().int().min(1).optional(),
  })
  .default({});

export type GetAllOptions = z.input<typeof getAllOptionsSchema>;

export class Queue {
  private readonly db: Kysely<Database>;

  private constructor(options: ConstructorOptions) {
    const dialect = new SqliteDialect({
      database: async () => {
        const db = new SQLite(options.path);
        db.pragma('journal_mode = WAL');
        db.pragma('auto_vacuum = FULL'); // Shrink database when data is deleted
        return db;
      },
    });

    this.db = new Kysely<Database>({dialect});
  }

  private async runMigrations() {
    const provider = new ESMFileMigrationProvider('./migrations');
    const migrator = new Migrator({db: this.db, provider});
    const {error} = await migrator.migrateToLatest();

    if (error) {
      throw error;
    }
  }

  static async new(options: ConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    // Make sure the directory of the file exists - SQLite will not create it
    const parentDir = dirname(opts.path);
    await mkdir(parentDir, {recursive: true});

    const queue = new Queue(opts);
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

  async size() {
    const record = await this.db
      .selectFrom('queue')
      .select(eb => eb.fn.count<number>('id').as('count'))
      .executeTakeFirstOrThrow();

    return record.count;
  }

  async isEmpty() {
    const record = await this.db
      .selectFrom('queue')
      .select(eb => eb.fn.count<number>('id').as('count'))
      .executeTakeFirstOrThrow();

    return record.count === 0;
  }
}
