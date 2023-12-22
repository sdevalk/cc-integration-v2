import {Queue} from '@colonial-collections/queue';
import {SparqlIterator} from '@colonial-collections/sparql-iterator';
import fastq from 'fastq';
import {readFile} from 'node:fs/promises';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  queue: z.instanceof(Queue),
  endpointUrl: z.string(),
  iterateQueryFile: z.string(),
  iterateWaitBetweenRequests: z.number().optional(),
  iterateTimeoutPerRequest: z.number().optional(),
  iterateNumberOfIrisPerRequest: z.number().optional(),
});

export type Input = z.input<typeof inputSchema>;

export const iterate = fromPromise(async ({input}: {input: Input}) => {
  const opts = inputSchema.parse(input);

  opts.logger.info(
    `Collecting IRIs from SPARQL endpoint "${opts.endpointUrl}"`
  );

  const save = async (iri: string) => opts.queue.push({iri});
  const iteratorQueue = fastq.promise(save, 1); // Concurrency
  const query = await readFile(opts.iterateQueryFile, 'utf-8');

  const iterator = new SparqlIterator({
    endpointUrl: opts.endpointUrl,
    waitBetweenRequests: opts.iterateWaitBetweenRequests,
    timeoutPerRequest: opts.iterateTimeoutPerRequest,
    numberOfIrisPerRequest: opts.iterateNumberOfIrisPerRequest,
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
});
