import {run} from './query.js';
import {Filestore} from '@colonial-collections/filestore';
import {Queue} from '@colonial-collections/queue';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

const tmpDir = './tmp/integration';
const resourceDir = join(tmpDir, 'resources');
const queueFile = join(tmpDir, 'queue.sqlite');
const queryFile = './fixtures/generate.rq';

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('run', () => {
  it('runs if queue is empty', async () => {
    await run({
      resourceDir,
      queueFile: './fixtures/empty-queue.sqlite',
      endpointUrl: 'https://vocab.getty.edu/sparql',
      queryFile,
    });
  });
});

describe('run', () => {
  let queue: Queue;
  const iri = 'http://vocab.getty.edu/aat/300111999';

  beforeEach(async () => {
    queue = await Queue.new({path: queueFile});
    await queue.push({iri});
  });

  it('processes all items in the queue', async () => {
    await run({
      resourceDir,
      queueFile,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      queryFile,
    });

    const isEmpty = await queue.isEmpty();
    expect(isEmpty).toBe(true);

    const filestore = new Filestore({dir: resourceDir});
    const pathOfObsoleteIri = filestore.createPathFromIri(iri);

    expect(existsSync(pathOfObsoleteIri)).toBe(true);
  });
});

describe('run', () => {
  let queue: Queue;
  const iri1 = 'http://vocab.getty.edu/aat/300111999';
  const iri2 = 'http://vocab.getty.edu/aat/300027200';

  beforeEach(async () => {
    queue = await Queue.new({path: queueFile});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});
  });

  it('processes the selected number of items in the queue', async () => {
    await run({
      resourceDir,
      queueFile,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      queryFile,
      batchSize: 1,
    });

    const items = await queue.getAll();
    const iris = items.map(item => item.iri);

    expect(iris).toEqual(['http://vocab.getty.edu/aat/300027200']);

    const filestore = new Filestore({dir: resourceDir});
    const pathOfUnprocessedIri = filestore.createPathFromIri(iri2);

    expect(existsSync(pathOfUnprocessedIri)).toBe(false);
  });
});
