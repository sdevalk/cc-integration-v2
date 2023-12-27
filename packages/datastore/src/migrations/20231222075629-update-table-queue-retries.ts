import {Database} from '../types.js';
import {Kysely} from 'kysely';

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('queue')
    .addColumn('retry_count', 'integer', col => col.defaultTo(0).notNull())
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('queue').dropColumn('retry_count').execute();
}
