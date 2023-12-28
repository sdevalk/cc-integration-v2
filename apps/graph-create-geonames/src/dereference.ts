import {ProgressLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/datastore';
import {DereferenceStorer} from '@colonial-collections/dereference-storer';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  queue: z.instanceof(Queue),
  topic: z.string().optional(),
  resourceDir: z.string(),
  dereferenceCredentials: z
    .object({
      type: z.literal('basic-auth'),
      username: z.string(),
      password: z.string(),
    })
    .optional(),
  dereferenceHeaders: z.record(z.string(), z.string()).optional(),
  dereferenceWaitBetweenRequests: z.number().optional(),
  dereferenceTimeoutPerRequest: z.number().optional(),
  dereferenceNumberOfConcurrentRequests: z.number().optional(),
  dereferenceBatchSize: z.number().optional(),
});

export type Input = z.input<typeof inputSchema>;

export const dereference = fromPromise(async ({input}: {input: Input}) => {
  const opts = inputSchema.parse(input);

  opts.logger.info('Dereferencing resources');

  const storer = new DereferenceStorer({
    logger: opts.logger,
    resourceDir: opts.resourceDir,
    credentials: opts.dereferenceCredentials,
    headers: opts.dereferenceHeaders,
  });

  const progress = new ProgressLogger({logger: opts.logger});
  storer.on(
    'stored-resource',
    (totalNumberOfResources: number, numberOfProcessedResources: number) => {
      progress.log({
        totalNumberOfResources,
        numberOfProcessedResources,
      });
    }
  );

  await storer.run({
    queue: opts.queue,
    topic: opts.topic,
    numberOfConcurrentRequests: opts.dereferenceNumberOfConcurrentRequests,
    waitBetweenRequests: opts.dereferenceWaitBetweenRequests,
    batchSize: opts.dereferenceBatchSize,
  });

  const queueSize = await opts.queue.size({topic: opts.topic});
  opts.logger.info(`There are ${queueSize} items left in the queue`);
});
