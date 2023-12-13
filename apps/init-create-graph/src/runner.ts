import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {Iterator} from '@colonial-collections/sparql-iterator';
import fastq from 'fastq';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const runOptionsSchema = z.object({
  endpointUrl: z.string(),
  queryFile: z.string(),
  waitBetweenRequests: z.number().optional(),
  numberOfIrisPerRequest: z.number().optional(),
  resourceDir: z.string(),
});

export type RunOptions = z.infer<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const startTime = performance.now();
  const logger = getLogger();
  const queue = new Queue({path: './db.sqlite'});
  await queue.init();

  const isEmpty = await queue.isEmpty();
  if (!isEmpty) {
    throw new Error('Cannot run: the queue is not empty');
  }

  logger.info(`Collecting IRIs from SPARQL endpoint "${opts.endpointUrl}"`);

  const save = async (iri: string) => queue.push({iri, status: 'pending'});
  const iteratorQueue = fastq.promise(save, 1); // Concurrency
  const query = await readFile(opts.queryFile, 'utf-8');

  const iterator = new Iterator({
    endpointUrl: opts.endpointUrl,
    waitBetweenRequests: opts.waitBetweenRequests,
    numberOfIrisPerRequest: opts.numberOfIrisPerRequest,
    query,
    queue: iteratorQueue,
  });

  iterator.on('warning', (err: Error) => logger.warn(err));
  iterator.on('error', (err: Error) => logger.error(err));
  iterator.on(
    'collected-iris',
    (numberOfIris: number, limit: number, offset: number) => {
      logger.info(
        `Collected ${numberOfIris} IRIs from offset ${offset} to ${
          offset + numberOfIris
        }`
      );
    }
  );

  await iterator.run();

  const finishTime = performance.now();
  const runtime = finishTime - startTime;
  logger.info(`Collected IRIs in ${PrettyMilliseconds(runtime)}`);
}
