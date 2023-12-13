import {getLogger} from '@colonial-collections/common';
import {Dereferencer} from '@colonial-collections/dereferencer';
import {Filestore} from '@colonial-collections/filestore';
import {Item, Queue} from '@colonial-collections/queue';
import fastq from 'fastq';
import {performance} from 'node:perf_hooks';
import {setTimeout} from 'node:timers/promises';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const runOptionsSchema = z.object({
  numberOfConcurrentRequests: z.number().min(1),
  waitBetweenRequests: z.number(),
  resourceDir: z.string(),
  queueFile: z.string(),
  batchSize: z.number().min(1),
});

export type RunOptions = z.infer<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const startTime = performance.now();
  const logger = getLogger();
  const queue = await Queue.new({path: opts.queueFile});

  const isEmpty = await queue.isEmpty();
  if (isEmpty) {
    logger.info('Cannot run: the queue is empty');
    return;
  }

  const filestore = new Filestore({dir: opts.resourceDir});
  const dereferencer = new Dereferencer();
  dereferencer.on('warning', (err: Error) => logger.warn(err));

  const save = async (item: Item) => {
    const quadStream = await dereferencer.run(item.iri);
    await filestore.save({iri: item.iri, quadStream});
    await queue.remove(item.id);
    await setTimeout(opts.waitBetweenRequests); // Try not to hurt the server or trigger its rate limiter
  };

  const derefQueue = fastq.promise(save, opts.numberOfConcurrentRequests);
  const items = await queue.getPending(opts.batchSize);
  logger.info(`Dereferencing ${items.length} IRIs`);

  for (const item of items) {
    derefQueue.push(item).catch(err => {
      logger.error(
        err,
        `An error occurred when dereferencing IRI ${item.iri}: ${err.message}`
      );
    });
  }

  await derefQueue.drained();

  const finishTime = performance.now();
  const runtime = finishTime - startTime;
  logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
}
