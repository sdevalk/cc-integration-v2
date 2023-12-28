import {ColumnType, Generated, Insertable, Selectable} from 'kysely';

export interface Database {
  queue: QueueTable;
}

export interface QueueTable {
  id: Generated<number>;
  iri: string;
  topic: ColumnType<string, string | undefined, string | undefined>;
  retry_count: ColumnType<number, number | undefined, number>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type QueueItem = Selectable<QueueTable>;
export type NewQueueItem = Insertable<QueueTable>;

export interface RegistryTable {
  id: Generated<number>;
  iri: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type RegistryItem = Selectable<RegistryTable>;
export type NewRegistryItem = Insertable<RegistryTable>;
