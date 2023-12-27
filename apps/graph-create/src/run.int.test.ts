import {run} from './run.js';
import {Connection, Queue} from '@colonial-collections/datastore';
import {Filestore} from '@colonial-collections/filestore';
import {existsSync} from 'node:fs';
import {cp, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {env} from 'node:process';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

let connection: Connection;
const tmpDir = './tmp/integration';
const resourceDir = join(tmpDir, 'resources');
const dataFile = join(tmpDir, 'data.sqlite');
const triplydbInstanceUrl = env.TRIPLYDB_INSTANCE_URL as string;
const triplydbApiToken = env.TRIPLYDB_API_TOKEN as string;
const triplydbAccount = env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string;
const triplydbDataset = env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string;
const triplydbServiceName = 'kg';
const triplydbServiceType = 'virtuoso';
const graphName = 'https://example.org/graph-create-integration';

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
  connection = await Connection.new({path: dataFile});
});

describe('run - if queue is empty', () => {
  it('collects IRIs of resources', async () => {
    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      iterateQueryFile: './fixtures/queries/iterate-john-mccallum.rq',
      generateQueryFile: '', // Unused for the test
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    const queue = new Queue({connection});
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

  it('deletes obsolete resources', async () => {
    // Copy obsolete resources
    await cp('./fixtures/dbpedia', resourceDir, {recursive: true});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      iterateQueryFile: './fixtures/queries/iterate-jack-dowding.rq',
      generateQueryFile: '', // Unused for the test
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    const queue = new Queue({connection});
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

describe('run - if queue is not empty', () => {
  it('processes a resource without uploading to data platform because the queue still contains resources', async () => {
    const iri1 = 'http://vocab.getty.edu/aat/300111999';
    const iri2 = 'http://vocab.getty.edu/aat/300027200';

    const queue = new Queue({connection});
    await queue.push({iri: iri1});
    await queue.push({iri: iri2});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      iterateQueryFile: '', // Unused for the test
      generateQueryFile: './fixtures/queries/generate-aat.rq',
      generateBatchSize: 1,
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });
  });

  it('processes all resources and uploads to the data platform because the queue does not contain resources anymore', async () => {
    const iri = 'http://vocab.getty.edu/aat/300111999';

    const queue = new Queue({connection});
    await queue.push({iri});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://vocab.getty.edu/sparql',
      iterateQueryFile: '', // Unused for the test
      generateQueryFile: './fixtures/queries/generate-aat.rq',
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
