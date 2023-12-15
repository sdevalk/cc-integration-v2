import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {TriplyDb} from '@colonial-collections/triplydb';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const runOptionsSchema = z.object({
  resourceDir: z.string(),
  queueFile: z.string(),
  triplydbInstanceUrl: z.string(),
  triplydbApiToken: z.string(),
  triplydbAccount: z.string(),
  triplydbDataset: z.string(),
  triplydbServiceName: z.string(),
  triplydbServiceType: z.string(),
  graphName: z.string(),
  dirTemp: z.string().optional(), // For storing temporary files
});

export type RunOptions = z.input<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const startTime = Date.now();
  const logger = getLogger();
  const queue = await Queue.new({path: opts.queueFile});

  // Only allowed to upload the RDF resources if all items in the queue have been processed
  if (!(await queue.isEmpty())) {
    throw new Error('Cannot run: the queue is not empty');
  }

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

  const finishTime = Date.now();
  const runtime = finishTime - startTime;
  logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
}
