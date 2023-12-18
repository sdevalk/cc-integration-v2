import {upload} from './upload.js';
import {getLogger, ProgressLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {SparqlStorer} from '@colonial-collections/sparql-storer';
import {readFile} from 'node:fs/promises';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const runOptionsSchema = z.object({
  resourceDir: z.string(),
  queueFile: z.string(),
  endpointUrl: z.string(),
  queryFile: z.string(),
  numberOfConcurrentRequests: z.number().min(1).default(1),
  waitBetweenRequests: z.number().min(0).optional(),
  timeoutPerRequest: z.number().min(0).default(60000),
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

  const query = await readFile(opts.queryFile, 'utf-8');
  const storer = new SparqlStorer({
    logger,
    resourceDir: opts.resourceDir,
    endpointUrl: opts.endpointUrl,
    query,
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

  // Only allowed to upload the RDF resources if all items in the queue have been processed
  if (queueSize === 0) {
    await upload(opts);
  }

  const finishTime = Date.now();
  const runtime = finishTime - startTime;
  logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
}
