import fastq from 'fastq';
import {SparqlIterator} from '@colonial-collections/sparql-iterator';
import {readFile} from 'node:fs/promises';

export async function iterate() {
  logger.info(`Collecting IRIs from SPARQL endpoint "${opts.endpointUrl}"`);

  const save = async (iri: string) => queue.push({iri});
  const iteratorQueue = fastq.promise(save, 1); // Concurrency
  const query = await readFile(opts.queryFile, 'utf-8');

  const iterator = new SparqlIterator({
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
}
