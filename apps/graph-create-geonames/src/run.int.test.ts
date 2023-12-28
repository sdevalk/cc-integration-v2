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
const locationsDir = join(resourceDir, 'locations');
const countriesDir = join(resourceDir, 'countries');
const dataFile = join(tmpDir, 'data.sqlite');
const triplydbInstanceUrl = env.TRIPLYDB_INSTANCE_URL as string;
const triplydbApiToken = env.TRIPLYDB_API_TOKEN as string;
const triplydbAccount = env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string;
const triplydbDataset = env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string;
const triplydbServiceName = 'kg';
const triplydbServiceType = 'virtuoso';
const graphName = 'https://example.org/graph-create-geonames-integration';

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
  connection = await Connection.new({path: dataFile});
});

describe('run - if queue is empty', () => {
  it('collects IRIs of locations', async () => {
    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: './fixtures/queries/iterate-locations.rq',
      countriesIterateQueryFile: '', // Unused for the test
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    const queue = new Queue({connection});
    const items = await queue.getAll({topic: 'locations'});
    const iris = items.map(item => item.iri);

    // This can change if the source data changes
    expect(iris).toEqual(
      expect.arrayContaining([
        'http://sws.geonames.org/1547220/',
        'http://sws.geonames.org/2759794/',
        'http://sws.geonames.org/2750375/',
        'http://sws.geonames.org/5095182/',
        'http://sws.geonames.org/3376762/',
        'http://sws.geonames.org/4262053/',
        'http://sws.geonames.org/7648384/',
        'http://sws.geonames.org/4744357/',
        'http://sws.geonames.org/6544881/',
        'http://sws.geonames.org/5323799/',
        'http://sws.geonames.org/4374800/',
        'http://sws.geonames.org/3383434/',
        'http://sws.geonames.org/2759793/',
        'http://sws.geonames.org/1651465/',
        'http://sws.geonames.org/2759788/',
        'http://sws.geonames.org/5145733/',
        'http://sws.geonames.org/7648382/',
        'http://sws.geonames.org/5264372/',
        'http://sws.geonames.org/2759787/',
        'http://sws.geonames.org/1622622/',
        'http://sws.geonames.org/1022857/',
      ])
    );
  });

  it('deletes obsolete locations', async () => {
    // Copy obsolete locations
    await cp('./fixtures/geonames/locations', locationsDir, {recursive: true});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: './fixtures/queries/iterate-locations.rq',
      countriesIterateQueryFile: '', // Unused for the test
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    // Obsolete resource about 'Delft' should have been deleted
    const obsoleteIri = 'https://sws.geonames.org/5024159/';
    const filestore = new Filestore({dir: locationsDir});
    const pathOfObsoleteIri = filestore.createPathFromIri(obsoleteIri);

    expect(existsSync(pathOfObsoleteIri)).toBe(false);
  });
});

describe('run - if queue contains locations', () => {
  it('dereferences a location', async () => {
    const iri1 = 'https://sws.geonames.org/2759794/';
    const iri2 = 'https://sws.geonames.org/5323799/';

    const queue = new Queue({connection});
    await queue.push({iri: iri1, topic: 'locations'});
    await queue.push({iri: iri2, topic: 'locations'});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: '', // Unused for the test
      countriesIterateQueryFile: './fixtures/queries/iterate-countries.rq',
      dereferenceBatchSize: 1,
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    const filestore = new Filestore({dir: locationsDir});
    const pathOfIri = filestore.createPathFromIri(iri1);

    expect(existsSync(pathOfIri)).toBe(true);
  });
});

describe('run - if queue does not contain locations', () => {
  it('collects IRIs of countries', async () => {
    const iri = 'https://sws.geonames.org/2759794/';

    const queue = new Queue({connection});
    await queue.push({iri, topic: 'locations'});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: '', // Unused for the test
      countriesIterateQueryFile: './fixtures/queries/iterate-countries.rq',
      dereferenceBatchSize: 1,
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    const items = await queue.getAll({topic: 'countries'});
    const iris = items.map(item => item.iri);

    // This can change if the source data changes
    expect(iris).toEqual(
      expect.arrayContaining(['https://sws.geonames.org/2750405/'])
    );
  });

  it('deletes obsolete countries', async () => {
    // Copy obsolete countries
    await cp('./fixtures/geonames/countries', countriesDir, {recursive: true});

    const iri = 'https://sws.geonames.org/2759794/';

    const queue = new Queue({connection});
    await queue.push({iri, topic: 'locations'});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: '', // Unused for the test
      countriesIterateQueryFile: './fixtures/queries/iterate-countries.rq',
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    // Obsolete resource about 'Germany' should have been deleted
    const obsoleteIri = 'https://sws.geonames.org/2921044/';
    const filestore = new Filestore({dir: countriesDir});
    const pathOfObsoleteIri = filestore.createPathFromIri(obsoleteIri);

    expect(existsSync(pathOfObsoleteIri)).toBe(false);
  });
});

describe('run - if queue contains countries', () => {
  it('dereferences a country without uploading to data platform because the queue still contains countries', async () => {
    const iri1 = 'https://sws.geonames.org/953987/';
    const iri2 = 'https://sws.geonames.org/6252001/';

    const queue = new Queue({connection});
    await queue.push({iri: iri1, topic: 'countries'});
    await queue.push({iri: iri2, topic: 'countries'});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: '', // Unused for the test
      countriesIterateQueryFile: './fixtures/queries/iterate-countries.rq',
      dereferenceBatchSize: 1,
      triplydbInstanceUrl,
      triplydbApiToken,
      triplydbAccount,
      triplydbDataset,
      triplydbServiceName,
      triplydbServiceType,
      graphName,
    });

    const filestore = new Filestore({dir: countriesDir});
    const pathOfIri = filestore.createPathFromIri(iri1);

    expect(existsSync(pathOfIri)).toBe(true);
  });

  it('dereferences a country and uploads to the data platform because the queue does not contain countries anymore', async () => {
    const iri = 'https://sws.geonames.org/953987/';

    const queue = new Queue({connection});
    await queue.push({iri, topic: 'countries'});

    await run({
      resourceDir,
      dataFile,
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsIterateQueryFile: '', // Unused for the test
      countriesIterateQueryFile: './fixtures/queries/iterate-countries.rq',
      dereferenceBatchSize: 1,
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
