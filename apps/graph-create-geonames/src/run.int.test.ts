import {run} from './run.js';
import {join} from 'node:path';
import {env} from 'node:process';
import {rimraf} from 'rimraf';
import {beforeEach, describe, it} from 'vitest';

const tmpDir = './tmp/geonames';
const resourceDir = join(tmpDir, 'resources');
const dataDir = join(tmpDir, 'data');
const triplydbInstanceUrl = env.TRIPLYDB_INSTANCE_URL as string;
const triplydbApiToken = env.TRIPLYDB_API_TOKEN as string;
const triplydbAccount = env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string;
const triplydbDataset = env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string;
const triplydbServiceName = 'kg';
const triplydbServiceType = 'virtuoso';
const graphName = 'https://example.org/geonames';

beforeEach(async () => {
  await rimraf(tmpDir);
});

describe('run', () => {
  it('runs', async () => {
    await run({
      endpointUrl:
        'https://api.colonialcollections.nl/datasets/data-hub-testing/knowledge-graph/services/kg/sparql',
      resourceDir,
      dataDir,
      locationsIterateQueryFile: './fixtures/iterate-locations.rq',
      countriesIterateQueryFile: './fixtures/iterate-countries.rq',
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
