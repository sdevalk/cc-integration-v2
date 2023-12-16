// src/migrations/create-table-queue.ts
import { sql } from "kysely";
async function up(db) {
  await db.schema.createTable("queue").addColumn("id", "integer", (col) => col.primaryKey().notNull()).addColumn("iri", "text", (col) => col.notNull()).addColumn(
    "created_at",
    "text",
    (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
  ).addColumn(
    "updated_at",
    "text",
    (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
  ).execute();
}
async function down(db) {
  await db.schema.dropTable("queue").execute();
}
export {
  down,
  up
};
