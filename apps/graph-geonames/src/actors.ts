import {ProgressLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {SparqlIterator} from '@colonial-collections/sparql-iterator';
import {SparqlStorer} from '@colonial-collections/sparql-storer';
import fastq from 'fastq';
import {readFile} from 'node:fs/promises';
import PrettyMilliseconds from 'pretty-ms';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const checkQueueInputOptionsSchema = z.object({
  queue: z.instanceof(Queue),
});

export type CheckQueueInputOptions = z.input<
  typeof checkQueueInputOptionsSchema
>;

export const checkQueue = fromPromise(
  async ({input}: {input: CheckQueueInputOptions}) => {
    const opts = checkQueueInputOptionsSchema.parse(input);
    return opts.queue.size();
  }
);

const finalizeInputOptionsSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  startTime: z.number(),
});

export type FinalizeInputOptions = z.input<typeof finalizeInputOptionsSchema>;

export const finalize = fromPromise(
  async ({input}: {input: FinalizeInputOptions}) => {
    const opts = finalizeInputOptionsSchema.parse(input);

    console.log('FINALIZE');

    const finishTime = Date.now();
    const runtime = finishTime - opts.startTime;
    opts.logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
  }
);

const iterateInputOptionsSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  queue: z.instanceof(Queue),
  endpointUrl: z.string(),
  iterateQueryFile: z.string(),
  waitBetweenRequests: z.number().optional(),
  numberOfIrisPerRequest: z.number().optional(),
});

export type IterateInputOptions = z.input<typeof iterateInputOptionsSchema>;

export const iterate = fromPromise(
  async ({input}: {input: IterateInputOptions}) => {
    const opts = iterateInputOptionsSchema.parse(input);

    opts.logger.info(
      `Collecting IRIs from SPARQL endpoint "${opts.endpointUrl}"`
    );

    const save = async (iri: string) => opts.queue.push({iri});
    const iteratorQueue = fastq.promise(save, 1); // Concurrency
    const query = await readFile(opts.iterateQueryFile, 'utf-8');

    const iterator = new SparqlIterator({
      endpointUrl: opts.endpointUrl,
      waitBetweenRequests: opts.waitBetweenRequests,
      numberOfIrisPerRequest: opts.numberOfIrisPerRequest,
      query,
      queue: iteratorQueue,
    });

    iterator.on('warning', (err: Error) => opts.logger.warn(err));
    iterator.on('error', (err: Error) => opts.logger.error(err));
    iterator.on(
      'collected-iris',
      (numberOfIris: number, limit: number, offset: number) => {
        opts.logger.info(
          `Collected ${numberOfIris} IRIs from offset ${offset} to ${
            offset + numberOfIris
          }`
        );
      }
    );

    await iterator.run();

    console.log('ITERATE');
  }
);

const generateInputOptionsSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  startTime: z.number(),
  queue: z.instanceof(Queue),
  endpointUrl: z.string(),
  generateQueryFile: z.string(),
  numberOfConcurrentRequests: z.number().min(1).default(1),
  waitBetweenRequests: z.number().min(0).optional(),
  timeoutPerRequest: z.number().min(0).default(60000),
  batchSize: z.number().min(1).default(1000),
  resourceDir: z.string(),
});

export type GenerateInputOptions = z.input<typeof generateInputOptionsSchema>;

export const generate = fromPromise(
  async ({input}: {input: GenerateInputOptions}) => {
    const opts = generateInputOptionsSchema.parse(input);

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
        progress.log({
          startTime: opts.startTime,
          totalNumberOfResources,
          numberOfProcessedResources,
        });
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

    console.log('GENERATE');
  }
);
