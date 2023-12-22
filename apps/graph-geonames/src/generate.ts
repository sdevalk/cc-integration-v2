import {ProgressLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {SparqlStorer} from '@colonial-collections/sparql-storer';
import {readFile} from 'node:fs/promises';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  queue: z.instanceof(Queue),
  resourceDir: z.string(),
  endpointUrl: z.string(),
  generateQueryFile: z.string(),
  numberOfConcurrentRequests: z.number().min(1).default(1),
  waitBetweenRequests: z.number().min(0).optional(),
  timeoutPerRequest: z.number().min(0).default(60000),
  batchSize: z.number().min(1).default(1000),
});

export type Input = z.input<typeof inputSchema>;

export const generate = fromPromise(async ({input}: {input: Input}) => {
  const opts = inputSchema.parse(input);

  const query = await readFile(opts.generateQueryFile, 'utf-8');
  const storer = new SparqlStorer({
    logger: opts.logger,
    resourceDir: opts.resourceDir,
    endpointUrl: opts.endpointUrl,
    query,
  });

  const progress = new ProgressLogger({logger: opts.logger});
  storer.on(
    'stored-resource',
    (totalNumberOfResources: number, numberOfProcessedResources: number) => {
      progress.log({totalNumberOfResources, numberOfProcessedResources});
    }
  );

  await storer.run({
    queue: opts.queue,
    numberOfConcurrentRequests: opts.numberOfConcurrentRequests,
    waitBetweenRequests: opts.waitBetweenRequests,
    batchSize: opts.batchSize,
  });

  const queueSize = await opts.queue.size();
  opts.logger.info(`There are ${queueSize} items left in the queue`);
});
