import {run} from './run.js';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {rimraf} from 'rimraf';
import {beforeEach, describe, it} from 'vitest';

const tmpDir = './tmp/integration';
const resourceDir = join(tmpDir, 'resources');
const queueFile = join(tmpDir, 'queue.sqlite');

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('run', () => {
  it('runs', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      queryFile: './fixtures/iterate.rq',
      resourceDir,
      queueFile,
    });
  });
});
