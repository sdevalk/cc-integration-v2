import {getLogger, ProgressLogger} from '@colonial-collections/common';
import {Filestore} from '@colonial-collections/filestore';
import {Item, Queue} from '@colonial-collections/queue';
import {SparqlGenerator} from '@colonial-collections/sparql-generator';
import fastq from 'fastq';
import {readFile} from 'node:fs/promises';
import {setTimeout} from 'node:timers/promises';
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
});

export type RunOptions = z.input<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const startTime = Date.now();
  const logger = getLogger();
  const queue = await Queue.new({path: opts.queueFile});

  if (await queue.isEmpty()) {
    throw new Error('Cannot run: the queue is empty');
  }

  const filestore = new Filestore({dir: opts.resourceDir});
  const query = await readFile(opts.queryFile, 'utf-8');
  const generator = new SparqlGenerator({
    endpointUrl: opts.endpointUrl,
    timeoutPerRequest: opts.timeoutPerRequest,
    query,
  });
  generator.on('warning', (err: Error) => logger.warn(err));

  const items = await queue.getAll({limit: opts.batchSize});
  logger.info(`Processing ${items.length} items from the queue`);

  const progress = new ProgressLogger({
    logger,
    startTime,
    totalNumberOfResources: items.length,
  });

  const save = async (item: Item) => {
    const quadStream = await generator.getResource(item.iri);
    await filestore.save({iri: item.iri, quadStream});
    await queue.remove(item.id);
    await setTimeout(opts.waitBetweenRequests); // Try not to hurt the server or trigger its rate limiter
    progress.log();
  };

  const saveQueue = fastq.promise(save, opts.numberOfConcurrentRequests);

  for (const item of items) {
    saveQueue.push(item).catch(err => {
      logger.error(
        err,
        `An error occurred when saving "${item.iri}": ${err.message}`
      );
    });
  }

  await saveQueue.drained();

  const queueSize = await queue.size();
  logger.info(`There are ${queueSize} items left in the queue`);

  const finishTime = Date.now();
  const runtime = finishTime - startTime;
  logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
}
