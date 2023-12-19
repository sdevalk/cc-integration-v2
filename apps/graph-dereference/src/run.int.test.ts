import {run} from './run.js';
import {Queue} from '@colonial-collections/queue';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {env} from 'node:process';
import {rimraf} from 'rimraf';
import {beforeEach, describe, it} from 'vitest';

const tmpDir = './tmp/integration';
const resourceDir = join(tmpDir, 'resources');
const queueFile = join(tmpDir, 'queue.sqlite');
const triplydbInstanceUrl = env.TRIPLYDB_INSTANCE_URL as string;
const triplydbApiToken = env.TRIPLYDB_API_TOKEN as string;
const triplydbAccount = env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string;
const triplydbDataset = env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string;
const triplydbServiceName = 'kg';
const triplydbServiceType = 'virtuoso';
const graphName = 'https://example.org/aat';

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('run', () => {
  it('runs if queue is empty', async () => {
    await run({
      resourceDir,
      queueFile: './fixtures/empty-queue.sqlite',
      headers: {
        Accept: 'text/turtle',
      },
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });
  });

  it('processes all items in the queue, then uploads to the data platform', async () => {
    const iri = 'http://vocab.getty.edu/aat/300111999';

    const queue = await Queue.new({path: queueFile});
    await queue.push({iri});

    await run({
      resourceDir,
      queueFile,
      headers: {
        Accept: 'text/turtle',
      },
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });
  });

  it('processes a limited number of items in the queue without uploading to the data platform', async () => {
    const iri1 = 'http://vocab.getty.edu/aat/300111999';
    const iri2 = 'http://vocab.getty.edu/aat/300027200';

    const queue = await Queue.new({path: queueFile});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});

    await run({
      resourceDir,
      queueFile,
      headers: {
        Accept: 'text/turtle',
      },
      batchSize: 1,
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });
  });
});
