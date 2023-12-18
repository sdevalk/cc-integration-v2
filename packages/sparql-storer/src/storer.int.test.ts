import {SparqlStorer} from './storer.js';
import {Filestore} from '@colonial-collections/filestore';
import {Queue} from '@colonial-collections/queue';
import {existsSync} from 'node:fs';
import {mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pino} from 'pino';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

const tmpDir = './tmp';
const resourceDir = join(tmpDir, 'resources');
const queueFile = join(tmpDir, 'queue.sqlite');
const queryFile = './fixtures/generate.rq';
const query = await readFile(queryFile, 'utf-8');
const filestore = new Filestore({dir: resourceDir});

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('run', () => {
  it('stores all items in the queue as files', async () => {
    expect.assertions(6);

    const iri1 = 'http://vocab.getty.edu/aat/300111999';
    const iri2 = 'http://vocab.getty.edu/aat/300027200';

    const queue = await Queue.new({path: queueFile});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});

    const storer = new SparqlStorer({
      logger: pino(),
      resourceDir,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      query,
    });

    let numberOfEmits = 0;
    storer.on('stored-resource', (totalNumberOfResources: number) => {
      expect(totalNumberOfResources).toBe(2);
      numberOfEmits++;
    });

    await storer.run({queue});

    expect(numberOfEmits).toBe(2);
    const queueSize = await queue.size();
    expect(queueSize).toBe(0);

    const pathOfIri1 = filestore.createPathFromIri(iri1);
    const pathOfIri2 = filestore.createPathFromIri(iri2);

    expect(existsSync(pathOfIri1)).toBe(true);
    expect(existsSync(pathOfIri2)).toBe(true);
  });

  it('stores the selected number of items in the queue as files', async () => {
    expect.assertions(5);

    const iri1 = 'http://vocab.getty.edu/aat/300111999';
    const iri2 = 'http://vocab.getty.edu/aat/300027200';

    const queue = await Queue.new({path: queueFile});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});

    const storer = new SparqlStorer({
      logger: pino(),
      resourceDir,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      query,
    });

    let numberOfEmits = 0;
    storer.on('stored-resource', (totalNumberOfResources: number) => {
      expect(totalNumberOfResources).toBe(1);
      numberOfEmits++;
    });

    await storer.run({queue, batchSize: 1});

    expect(numberOfEmits).toBe(1);
    const queueSize = await queue.size();
    expect(queueSize).toBe(1);

    const pathOfIri1 = filestore.createPathFromIri(iri1);
    const pathOfIri2 = filestore.createPathFromIri(iri2);

    expect(existsSync(pathOfIri1)).toBe(true);
    expect(existsSync(pathOfIri2)).toBe(false);
  });

  it('stores the selected number of items in the queue as files, changing the batch size between runs', async () => {
    const iri1 = 'http://vocab.getty.edu/aat/300111999';
    const iri2 = 'http://vocab.getty.edu/aat/300027200';
    const iri3 = 'http://vocab.getty.edu/aat/300266639';

    const queue = await Queue.new({path: queueFile});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});
    await queue.push({iri: iri3});

    const storer = new SparqlStorer({
      logger: pino(),
      resourceDir,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      query,
    });

    await storer.run({queue, batchSize: 1});

    const pathOfIri1 = filestore.createPathFromIri(iri1);
    const pathOfIri2 = filestore.createPathFromIri(iri2);
    const pathOfIri3 = filestore.createPathFromIri(iri3);

    expect(existsSync(pathOfIri1)).toBe(true);
    expect(existsSync(pathOfIri2)).toBe(false);
    expect(existsSync(pathOfIri3)).toBe(false);

    await storer.run({queue, batchSize: 2});

    expect(existsSync(pathOfIri2)).toBe(true);
    expect(existsSync(pathOfIri3)).toBe(true);
  });
});
