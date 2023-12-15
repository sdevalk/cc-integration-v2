import {getLogger} from '@colonial-collections/common';
import {Filestore} from '@colonial-collections/filestore';
import {Queue} from '@colonial-collections/queue';
import {Iterator} from '@colonial-collections/sparql-iterator';
import fastq from 'fastq';
import {readFile} from 'node:fs/promises';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const runOptionsSchema = z.object({
  endpointUrl: z.string(),
  queryFile: z.string(),
  waitBetweenRequests: z.number().optional(),
  numberOfIrisPerRequest: z.number().optional(),
  resourceDir: z.string(),
  queueFile: z.string(),
});

export type RunOptions = z.input<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const startTime = Date.now();
  const logger = getLogger();
  const filestore = new Filestore({dir: opts.resourceDir});
  const queue = await Queue.new({path: opts.queueFile});

  if (!(await queue.isEmpty())) {
    throw new Error('Cannot run: the queue is not empty');
  }

  logger.info(`Collecting IRIs from SPARQL endpoint "${opts.endpointUrl}"`);

  const save = async (iri: string) => queue.push({iri});
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

  logger.info(`Deleting obsolete resources in "${opts.resourceDir}"`);

  // Compare the queued IRIs with those previously stored on file,
  // removing resources that have become obsolete
  const items = await queue.getAll();
  const hashesOfCurrentIris = items.map(item =>
    filestore.createHashFromIri(item.iri)
  );
  const matchFn = async (hashOfIri: string) =>
    !hashesOfCurrentIris.includes(hashOfIri);

  const deleteCount = await filestore.deleteIfMatches(matchFn);
  logger.info(
    `Deleted ${deleteCount} obsolete resources in "${opts.resourceDir}"`
  );

  const finishTime = Date.now();
  const runtime = finishTime - startTime;
  logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
}
