import {upload} from './upload.js';
import {env} from 'node:process';
import {describe, it} from 'vitest';

describe('upload', () => {
  it('uploads files', async () => {
    await upload({
      resourceDir: './fixtures/aat',
      triplydbInstanceUrl: env.TRIPLYDB_INSTANCE_URL as string,
      triplydbApiToken: env.TRIPLYDB_API_TOKEN as string,
      triplydbAccount: env.TRIPLYDB_ACCOUNT_DEVELOPMENT as string,
      triplydbDataset: env.TRIPLYDB_DATASET_KG_DEVELOPMENT as string,
      triplydbServiceName: 'kg',
      triplydbServiceType: 'virtuoso',
      graphName: 'https://example.org/aat',
    });
  });
});
