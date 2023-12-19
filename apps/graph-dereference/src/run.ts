import {getLogger, ProgressLogger} from '@colonial-collections/common';
import {DereferenceStorer} from '@colonial-collections/dereference-storer';
import {Queue} from '@colonial-collections/queue';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const runOptionsSchema = z.object({
  resourceDir: z.string(),
  queueFile: z.string(),
  credentials: z
    .object({
      type: z.literal('basic-auth'),
      username: z.string(),
      password: z.string(),
    })
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
  numberOfConcurrentRequests: z.number().min(1).default(1),
  waitBetweenRequests: z.number().min(0).optional(),
  batchSize: z.number().min(1).default(1000),
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

  // Valid state - do not throw an error
  if (await queue.isEmpty()) {
    logger.info('Cannot run: the queue is empty');
    return;
  }

  const storer = new DereferenceStorer({
    logger,
    resourceDir: opts.resourceDir,
    credentials: opts.credentials,
    headers: opts.headers,
  });

  const progress = new ProgressLogger({logger});
  storer.on(
    'stored-resource',
    (totalNumberOfResources: number, numberOfProcessedResources: number) => {
      progress.log({
        startTime,
        totalNumberOfResources,
        numberOfProcessedResources,
      });
    }
  );

  await storer.run({
    queue,
    numberOfConcurrentRequests: opts.numberOfConcurrentRequests,
    waitBetweenRequests: opts.waitBetweenRequests,
    batchSize: opts.batchSize,
  });

  const queueSize = await queue.size();
  logger.info(`There are ${queueSize} items left in the queue`);

  const finishTime = Date.now();
  const runtime = finishTime - startTime;
  logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
}
