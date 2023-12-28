import {Queue} from '@colonial-collections/datastore';
import {Filestore} from '@colonial-collections/filestore';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  queue: z.instanceof(Queue),
  topic: z.string().optional(),
  resourceDir: z.string(),
});

export type Input = z.input<typeof inputSchema>;

// Compare the queued IRIs with those previously stored on file,
// removing resources that have become obsolete
export const deleteObsoleteResources = fromPromise(
  async ({input}: {input: Input}) => {
    const opts = inputSchema.parse(input);

    opts.logger.info(`Deleting obsolete resources in "${opts.resourceDir}"`);

    // Beware: if the queue is empty all existing resources on file will be deleted
    const items = await opts.queue.getAll({topic: opts.topic});
    const filestore = new Filestore({dir: opts.resourceDir});

    const hashesOfCurrentIris = items.map(item =>
      filestore.createHashFromIri(item.iri)
    );
    const matchFn = async (hashOfIri: string) =>
      !hashesOfCurrentIris.includes(hashOfIri);

    const deleteCount = await filestore.deleteIfMatches(matchFn);

    opts.logger.info(
      `Deleted ${deleteCount} obsolete resources in "${opts.resourceDir}"`
    );
  }
);
