import {Connection} from './connection.js';
import {Database, NewRunItem} from './types.js';
import {Kysely} from 'kysely';
import {z} from 'zod';

const constructorOptionsSchema = z.object({
  connection: z.instanceof(Connection),
});

export type RunsConstructorOptions = z.input<typeof constructorOptionsSchema>;

export class Runs {
  private db: Kysely<Database>;

  constructor(options: RunsConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    this.db = opts.connection.db;
  }

  async save(item: NewRunItem) {
    return this.db
      .insertInto('runs')
      .values(item)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: number) {
    await this.db.deleteFrom('runs').where('id', '=', id).execute();
  }

  async getLastRun() {
    return this.db
      .selectFrom('runs')
      .orderBy('created_at asc')
      .selectAll()
      .executeTakeFirst();
  }
}
