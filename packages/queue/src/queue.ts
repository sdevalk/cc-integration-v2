import {db} from './database.js';
import {NewQueueItem, QueueItemUpdate} from './types.js';

export async function createItem(item: NewQueueItem) {
  return db
    .insertInto('queue')
    .values(item)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateItem(id: number, updateWith: QueueItemUpdate) {
  return db.updateTable('queue').set(updateWith).where('id', '=', id).execute();
}

export async function deleteItem(id: number) {
  return db
    .deleteFrom('queue')
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
}

export async function findPendingItems(limit: number) {
  return db
    .selectFrom('queue')
    .where('status', '=', 'pending')
    .selectAll()
    .limit(limit)
    .execute();
}
