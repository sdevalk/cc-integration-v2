import {ColumnType, Generated, Insertable, Selectable} from 'kysely';

export interface Database {
  queue: QueueTable;
}

export interface QueueTable {
  // Columns that are generated by the database should be marked
  // using the `Generated` type. This way they are automatically
  // made optional in inserts and updates.
  id: Generated<number>;
  iri: string;
  // You can specify a different type for each operation (select, insert and
  // update) using the `ColumnType<SelectType, InsertType, UpdateType>`
  // wrapper. Here we define a column `created_at` that is selected as
  // a `Date`, can optionally be provided as a `string` in inserts and
  // can never be updated:
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// You should not use the table schema interfaces directly. Instead, you should
// use the `Selectable`, `Insertable` and `Updateable` wrappers. These wrappers
// make sure that the correct types are used in each operation.
export type Item = Selectable<QueueTable>;
export type NewItem = Insertable<QueueTable>;
