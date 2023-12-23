import {run} from './run.js';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {env} from 'node:process';
import {rimraf} from 'rimraf';
import {beforeEach, describe, it} from 'vitest';

const tmpDir = './tmp/integration';
const locationsResourceDir = join(tmpDir, 'resources', 'locations');
const countriesResourceDir = join(tmpDir, 'resources', 'countries');
const locationsQueueFile = join(tmpDir, 'locations.sqlite');
const countriesQueueFile = join(tmpDir, 'countries.sqlite');
const triplydbInstanceUrl = env.TRIPLYDB_INSTANCE_URL as string;
const triplydbApiToken = env.TRIPLYDB_API_TOKEN as string;
const triplydbAccount = env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string;
const triplydbDataset = env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string;
const triplydbServiceName = 'kg';
const triplydbServiceType = 'virtuoso';
const graphName = 'https://example.org/dbpedia';

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('run', () => {
  it('runs', async () => {
    await run({
      endpointUrl: 'https://dbpedia.org/sparql',
      locationsResourceDir,
      iterateLocationsQueryFile: './fixtures/iterate-locations.rq',
      locationsQueueFile,
      countriesResourceDir,
      iterateCountriesQueryFile: './fixtures/iterate-countries.rq',
      countriesQueueFile,
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
