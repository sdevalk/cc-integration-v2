import {Filestore} from '@colonial-collections/filestore';

export async function remove() {
  logger.info(`Deleting obsolete resources in "${opts.resourceDir}"`);

  // Compare the queued IRIs with those previously stored on file,
  // removing resources that have become obsolete
  const items = await queue.getAll();
  const filestore = new Filestore({dir: opts.resourceDir});
  const hashesOfCurrentIris = items.map(item =>
    filestore.createHashFromIri(item.iri)
  );
  const matchFn = async (hashOfIri: string) =>
    !hashesOfCurrentIris.includes(hashOfIri);

  const deleteCount = await filestore.deleteIfMatches(matchFn);
  logger.info(
    `Deleted ${deleteCount} obsolete resources in "${opts.resourceDir}"`
  );
}
