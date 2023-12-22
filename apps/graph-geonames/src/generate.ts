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
  generateWaitBetweenRequests: z.number().optional(),
  generateTimeoutPerRequest: z.number().optional(),
  generateNumberOfConcurrentRequests: z.number().optional(),
  generateBatchSize: z.number().optional(),
});

export type Input = z.input<typeof inputSchema>;

export const generate = fromPromise(async ({input}: {input: Input}) => {
  const opts = inputSchema.parse(input);

  const query = await readFile(opts.generateQueryFile, 'utf-8');
  const storer = new SparqlStorer({
    logger: opts.logger,
    resourceDir: opts.resourceDir,
    endpointUrl: opts.endpointUrl,
    timeoutPerRequest: opts.generateTimeoutPerRequest,
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
    waitBetweenRequests: opts.generateWaitBetweenRequests,
    numberOfConcurrentRequests: opts.generateNumberOfConcurrentRequests,
    batchSize: opts.generateBatchSize,
  });

  const queueSize = await opts.queue.size();
  opts.logger.info(`There are ${queueSize} items left in the queue`);
});
