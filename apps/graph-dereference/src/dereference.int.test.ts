import {run} from './dereference.js';
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

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('run', () => {
  it('throws if queue is empty', async () => {
    expect.assertions(1);

    try {
      await run({
        resourceDir,
        queueFile: './fixtures/empty-queue.sqlite',
      });
    } catch (err) {
      const error = err as Error;
      expect(error.message).toEqual('Cannot run: the queue is empty');
    }
  });
});

describe('run', () => {
  let queue: Queue;
  const iri = 'http://dbpedia.org/resource/Jack_Dowding_(footballer)';

  beforeEach(async () => {
    queue = await Queue.new({path: queueFile});
    await queue.push({iri});
  });

  it('processes all items in the queue', async () => {
    await run({
      resourceDir,
      queueFile,
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
  const iri1 = 'http://dbpedia.org/resource/Jack_Dowding_(footballer)';
  const iri2 =
    'http://dbpedia.org/resource/John_McCallum_(Australian_politician)';

  beforeEach(async () => {
    queue = await Queue.new({path: queueFile});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});
  });

  it('processes the selected number of items in the queue', async () => {
    await run({
      resourceDir,
      queueFile,
      batchSize: 1,
    });

    const items = await queue.getAll();
    const iris = items.map(item => item.iri);

    expect(iris).toEqual([
      'http://dbpedia.org/resource/John_McCallum_(Australian_politician)',
    ]);

    const filestore = new Filestore({dir: resourceDir});
    const pathOfUnprocessedIri = filestore.createPathFromIri(iri2);

    expect(existsSync(pathOfUnprocessedIri)).toBe(false);
  });
});
