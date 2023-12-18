import {run} from './run.js';
import {join} from 'node:path';
import {describe, it} from 'vitest';

const tmpDir = './tmp/integration';
const resourceDir = join(tmpDir, 'resources');
const queueFile = join(tmpDir, 'queue.sqlite');

describe('run', () => {
  it('runs', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      queryFile: './fixtures/iterate-1.rq',
      resourceDir,
      queueFile,
    });
  });
});
