import {run} from './runner.js';
import {existsSync} from 'node:fs';
import {cp} from 'node:fs/promises';
import {rimraf} from 'rimraf';
import {beforeEach, describe, it} from 'vitest';

const resourceDir = './tmp/dbpedia';

beforeEach(async () => {
  await rimraf(resourceDir);
});

describe('run', () => {
  it('does not run if queue is not empty', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      queryFile: './fixtures/iterate-1.rq',
      resourceDir,
      queueFile: './fixtures/non-empty-queue.sqlite',
    });
  });
});

describe('run', () => {
  beforeEach(async () => {
    // Copy obsolete files
    await cp('./fixtures/dbpedia', resourceDir, {recursive: true});
  });

  it.skip('runs and deletes obsolete resources', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      queryFile: './fixtures/iterate-2.rq',
      resourceDir,
      queueFile: './tmp/queue.sqlite',
    });

    // const path1 = store.createPathFromIri(iri1);
    // expect(existsSync(path1)).toBe(false);
  });
});
