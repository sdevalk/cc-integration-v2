import {run} from './upload.js';
import {env} from 'node:process';
import {describe, expect, it} from 'vitest';

describe('run', () => {
  it('throws if queue is not empty', async () => {
    expect.assertions(1);

    try {
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
    } catch (err) {
      const error = err as Error;
      expect(error.message).toEqual('Cannot run: the queue is not empty');
    }
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
