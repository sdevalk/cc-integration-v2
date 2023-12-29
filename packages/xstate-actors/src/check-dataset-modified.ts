import {SparqlEndpointFetcher} from 'fetch-sparql-endpoint';
import pRetry from 'p-retry';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  endpointUrl: z.string().url(),
  datasetId: z.string(),
  dateLastRun: z.date(),
});

export type CheckIfDatasetHasBeenModifiedInput = z.input<typeof inputSchema>;

export const checkIfDatasetHasBeenModified = fromPromise(
  async ({input}: {input: CheckIfDatasetHasBeenModifiedInput}) => {
    const opts = inputSchema.parse(input);

    const fetcher = new SparqlEndpointFetcher();
    const dateLastRun = opts.dateLastRun;

    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      ASK {
        BIND("${dateLastRun.toISOString()}"^^xsd:dateTime AS ?dateLastRun)
        <${opts.datasetId}> a schema:Dataset ;
          schema:dateModified ?rawDateModified .
        BIND(xsd:dateTime(?rawDateModified) AS ?dateModified)
        FILTER(?dateModified > ?dateLastRun)
      }
    `;

    const run = async () => fetcher.fetchAsk(opts.endpointUrl, query);

    const isModified = await pRetry(run, {
      retries: 3,
      onFailedAttempt: err => {
        opts.logger.warn(
          err,
          `Failed to fetch results from SPARQL endpoint: ${err.message}`
        );
      },
    });

    return isModified;
  }
);
