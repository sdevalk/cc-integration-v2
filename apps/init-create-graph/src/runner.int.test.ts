import {run} from './runner.js';
import {Filestore} from '@colonial-collections/filestore';
import {Queue} from '@colonial-collections/queue';
import {existsSync} from 'node:fs';
import {cp, mkdir} from 'node:fs/promises';
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
  it('saves collected IRIs in queue', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      queryFile: './fixtures/iterate-1.rq',
      resourceDir,
      queueFile,
    });

    const queue = await Queue.new({path: queueFile});
    const items = await queue.getAll();
    const iris = items.map(item => item.iri);

    // This can change if the source data changes
    expect(iris).toEqual(
      expect.arrayContaining([
        'http://dbpedia.org/resource/John_McCallum_(sports_writer)',
        'http://dbpedia.org/resource/Jack_Dowding_(footballer)',
        'http://dbpedia.org/resource/John_McCallum',
        'http://dbpedia.org/resource/John_McCallum_(Australian_politician)',
        'http://dbpedia.org/resource/John_McCallum_(actor)',
      ])
    );
  });
});

describe('run', () => {
  beforeEach(async () => {
    // Copy obsolete resources
    await cp('./fixtures/dbpedia', resourceDir, {recursive: true});
  });

  it('deletes obsolete resources', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      queryFile: './fixtures/iterate-2.rq', // Get IRIs about 'Jack Dowding'
      resourceDir,
      queueFile,
    });

    const queue = await Queue.new({path: queueFile});
    const items = await queue.getAll();
    const iris = items.map(item => item.iri);

    // This can change if the source data changes
    expect(iris).toEqual([
      'http://dbpedia.org/resource/Jack_Dowding_(footballer)',
    ]);

    // Obsolete resource about 'John McCallum' should have been deleted
    const obsoleteIri =
      'http://dbpedia.org/resource/John_McCallum_(Australian_politician)';
    const filestore = new Filestore({dir: resourceDir});
    const pathOfObsoleteIri = filestore.createPathFromIri(obsoleteIri);

    expect(existsSync(pathOfObsoleteIri)).toBe(false);
  });
});
