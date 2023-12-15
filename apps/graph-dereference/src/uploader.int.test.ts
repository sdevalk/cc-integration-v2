import {run} from './uploader.js';
import {env} from 'node:process';
import {describe, it} from 'vitest';

describe('run', () => {
  it('does not upload files if queue is not empty', async () => {
    await run({
      resourceDir: './fixtures/dbpedia',
      queueFile: './fixtures/filled-queue.sqlite',
      triplydbInstanceUrl: env.TRIPLYDB_INSTANCE_URL as string,
      triplydbApiToken: env.TRIPLYDB_API_TOKEN as string,
      triplydbAccount: env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string,
      triplydbDataset: env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string,
      triplydbServiceName: 'kg',
      triplydbServiceType: 'virtuoso',
      graphName: 'https://example.org/dbpedia',
    });
  });

  it('uploads files if queue is empty', async () => {
    await run({
      resourceDir: './fixtures/dbpedia',
      queueFile: './fixtures/empty-queue.sqlite',
      triplydbInstanceUrl: env.TRIPLYDB_INSTANCE_URL as string,
      triplydbApiToken: env.TRIPLYDB_API_TOKEN as string,
      triplydbAccount: env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string,
      triplydbDataset: env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string,
      triplydbServiceName: 'kg',
      triplydbServiceType: 'virtuoso',
      graphName: 'https://example.org/dbpedia',
    });
  });
});
