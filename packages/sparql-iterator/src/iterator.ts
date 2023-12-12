import {type queueAsPromised} from 'fastq';
import {IBindings, SparqlEndpointFetcher} from 'fetch-sparql-endpoint';
import {EventEmitter} from 'node:events';
import {setTimeout} from 'node:timers/promises';
import pRetry from 'p-retry';
import {z} from 'zod';

export const constructorOptionsSchema = z.object({
  endpointUrl: z.string().url(),
  endpointMethod: z.enum(['GET', 'POST']).default('POST'),
  waitBetweenRequests: z.number().min(0).default(0),
  timeoutPerRequest: z.number().min(0).default(60000),
  numberOfIrisPerRequest: z.number().min(1).default(1000),
  query: z.string(),
  queue: z.any(),
});

export type ConstructorOptions = z.input<typeof constructorOptionsSchema>;

export class Iterator extends EventEmitter {
  private endpointUrl: string;
  private numberOfIrisPerRequest: number;
  private waitBetweenRequests: number;
  private fetcher: SparqlEndpointFetcher;
  private query: string;
  private queue: queueAsPromised<string>;

  constructor(options: ConstructorOptions) {
    super();

    const opts = constructorOptionsSchema.parse(options);

    this.endpointUrl = opts.endpointUrl;
    this.numberOfIrisPerRequest = opts.numberOfIrisPerRequest;
    this.waitBetweenRequests = opts.waitBetweenRequests;
    this.query = this.getAndValidateIterateQuery(opts.query);
    this.fetcher = new SparqlEndpointFetcher({
      method: opts.endpointMethod,
      timeout: opts.timeoutPerRequest,
    });
    this.queue = opts.queue;
  }

  private getAndValidateIterateQuery(query: string) {
    // Some sanity checks - can be optimized
    // TBD: use sparqljs for validation?
    const bindings = ['?_limit', '?_offset']; // Basil notation
    const hasBindings = bindings.every(
      binding => query.indexOf(binding) !== undefined
    );
    if (!hasBindings) {
      throw new Error(
        `Bindings are missing in iterate query: ${bindings.join(', ')}`
      );
    }

    return query;
  }

  private async collectIrisInRange(limit: number, offset: number) {
    let hasResults = false;
    let numberOfIris = 0;

    // TBD: instead of doing string replacements, generate a new SPARQL query using sparqljs?
    const query = this.query
      .replace('?_limit', limit.toString())
      .replace('?_offset', offset.toString());

    const run = async () => this.fetcher.fetchBindings(this.endpointUrl, query);

    const bindingsStream = await pRetry(run, {
      retries: 3,
      onFailedAttempt: err => {
        const prettyError = new Error(
          `Failed to fetch results from SPARQL endpoint: ${err.message}`
        );
        prettyError.stack = err.stack;
        this.emit('warning', prettyError);
      },
    });

    for await (const rawBindings of bindingsStream) {
      hasResults = true;
      numberOfIris++; // For progress monitoring

      const bindings = rawBindings as unknown as IBindings; // TS assumes it's a string or Buffer
      const iri = bindings.this.value;

      this.queue.push(iri).catch(err => {
        const prettyError = new Error(
          `An error occurred when pushing IRI "${iri}" to queue: ${err.message}`
        );
        prettyError.stack = err.stack;
        this.emit('error', prettyError);
      });
    }

    if (hasResults) {
      this.emit('collected-iris', numberOfIris, limit, offset);
    }

    return hasResults;
  }

  private async collectIris() {
    const limit = this.numberOfIrisPerRequest;
    let offset = 0;

    let hasResults = false;
    do {
      try {
        hasResults = await this.collectIrisInRange(limit, offset);
      } catch (err) {
        const error = err as Error;
        const prettyError = new Error(
          `Error while collecting ${limit} IRIs from offset ${offset}: ${error.message}`
        );
        prettyError.stack = error.stack;
        this.emit('error', prettyError);
      }

      // Try not to hurt the server or trigger its rate limiter
      await setTimeout(this.waitBetweenRequests);

      offset += limit;
    } while (hasResults);
  }

  async run() {
    await this.collectIris();
  }
}
