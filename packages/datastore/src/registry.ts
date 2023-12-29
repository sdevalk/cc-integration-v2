import {Connection} from './connection.js';
import {Database, NewRegistryItem} from './types.js';
import {Kysely, sql} from 'kysely';
import {z} from 'zod';

const constructorOptionsSchema = z.object({
  connection: z.instanceof(Connection),
});

export type RegistryConstructorOptions = z.input<
  typeof constructorOptionsSchema
>;

const removeObsoleteOptionsSchema = z
  .object({
    type: z.string().optional(),
  })
  .default({});

export type RemoveObsoleteOptions = z.input<typeof removeObsoleteOptionsSchema>;

export class Registry {
  private db: Kysely<Database>;

  constructor(options: RegistryConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    this.db = opts.connection.db;
  }

  async getAll() {
    return this.db.selectFrom('registry').selectAll().execute();
  }

  async save(item: NewRegistryItem) {
    // Update if the item already exists
    return this.db
      .insertInto('registry')
      .values({iri: item.iri, type: item.type})
      .onConflict(oc =>
        oc.column('iri').doUpdateSet({updated_at: sql`CURRENT_TIMESTAMP`})
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // Remove all items from the registry that aren't in the queue
  async removeObsolete(options?: RemoveObsoleteOptions) {
    const opts = removeObsoleteOptionsSchema.parse(options);

    let subQuery = this.db.selectFrom('queue').select('iri');
    if (opts.type !== undefined) {
      subQuery = subQuery.where('type', '=', opts.type);
    }

    let selectQuery = this.db
      .selectFrom('registry')
      .where('iri', 'not in', subQuery)
      .selectAll();

    if (opts.type !== undefined) {
      selectQuery = selectQuery.where('type', '=', opts.type);
    }

    const obsoleteItems = await selectQuery.execute();

    // Beware: if the queue is empty all existing resources will be removed
    let deleteQuery = this.db
      .deleteFrom('registry')
      .where('iri', 'not in', subQuery);

    if (opts.type !== undefined) {
      deleteQuery = deleteQuery.where('type', '=', opts.type);
    }

    await deleteQuery.execute();

    return obsoleteItems;
  }
}
