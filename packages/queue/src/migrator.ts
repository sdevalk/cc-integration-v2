import {db} from './database.js';
import {Migrator, FileMigrationProvider} from 'kysely';
import fs from 'node:fs/promises';
import path from 'node:path';
import {URL, fileURLToPath} from 'node:url';

async function migrateToLatest() {
  const dirname = fileURLToPath(new URL('.', import.meta.url));
  const migrationFolder = path.join(dirname, 'migrations');
  const provider = new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  });

  const migrator = new Migrator({db, provider});
  const {error, results} = await migrator.migrateToLatest();

  results?.forEach(result => {
    if (result.status === 'Success') {
      console.log(
        `Migration "${result.migrationName}" was executed successfully`
      );
    } else if (result.status === 'Error') {
      console.error(`Failed to execute migration "${result.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to migrate');
    console.error(error);
    throw error;
  }

  await db.destroy();
}

migrateToLatest();
