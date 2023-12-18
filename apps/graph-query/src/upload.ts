import {getLogger} from '@colonial-collections/common';
import {TriplyDb} from '@colonial-collections/triplydb';
import {z} from 'zod';

const optionsSchema = z.object({
  resourceDir: z.string(),
  triplydbInstanceUrl: z.string(),
  triplydbApiToken: z.string(),
  triplydbAccount: z.string(),
  triplydbDataset: z.string(),
  triplydbServiceName: z.string(),
  triplydbServiceType: z.string(),
  graphName: z.string(),
  dirTemp: z.string().optional(), // For storing temporary files
});

export type Options = z.input<typeof optionsSchema>;

export async function upload(options: Options) {
  const opts = optionsSchema.parse(options);

  const logger = getLogger();

  const triplyDb = await TriplyDb.new({
    logger,
    instanceUrl: opts.triplydbInstanceUrl,
    apiToken: opts.triplydbApiToken,
    account: opts.triplydbAccount,
    dataset: opts.triplydbDataset,
  });

  await triplyDb.upsertGraphFromDirectory({
    graph: opts.graphName,
    dir: opts.resourceDir,
    dirTemp: opts.dirTemp,
  });

  await triplyDb.restartService({
    name: opts.triplydbServiceName,
    type: opts.triplydbServiceType,
  });
}
