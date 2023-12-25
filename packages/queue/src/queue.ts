import {ESMFileMigrationProvider} from './provider.js';
import {Database, Item, NewItem} from './types.js';
import SQLite from 'better-sqlite3';
import {Migrator, Kysely, SqliteDialect} from 'kysely';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {z} from 'zod';

export const constructorOptionsSchema = z.object({
  path: z.string(),
  maxRetryCount: z.number().int().min(0).default(3),
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
  private readonly maxRetryCount: number;

  constructor(options: ConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    const dialect = new SqliteDialect({
      database: async () => {
        // Make sure the directory of the file exists - SQLite will not create it
        await mkdir(dirname(opts.path), {recursive: true});

        const db = new SQLite(opts.path);
        db.pragma('journal_mode = WAL');
        db.pragma('auto_vacuum = FULL'); // Shrink database when data is deleted
        return db;
      },
    });

    this.db = new Kysely<Database>({dialect});
    this.maxRetryCount = opts.maxRetryCount;
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

  async retry(item: Item) {
    await this.remove(item.id);

    const newRetryCount = item.retry_count + 1;
    if (newRetryCount > this.maxRetryCount) {
      throw new Error(
        `Cannot retry "${item.iri}": max retry count of ${this.maxRetryCount} reached`
      );
    }

    const newItem: NewItem = {
      iri: item.iri,
      retry_count: newRetryCount,
    };
    return this.push(newItem);
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
    const size = await this.size();
    return size === 0;
  }
}
