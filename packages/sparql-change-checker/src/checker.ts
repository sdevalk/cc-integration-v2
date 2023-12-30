import {SparqlEndpointFetcher} from 'fetch-sparql-endpoint';
import {EventEmitter} from 'node:events';
import pRetry from 'p-retry';
import {z} from 'zod';

export const constructorOptionsSchema = z.object({
  endpointUrl: z.string().url(),
  endpointMethod: z.enum(['GET', 'POST']).default('POST'),
  timeoutPerRequest: z.number().min(0).default(60000),
});

export type ConstructorOptions = z.input<typeof constructorOptionsSchema>;

export const runOptionsSchema = z.object({
  query: z.string(),
  iri: z.string().url(),
  compareValue: z.string().or(z.number()), // E.g. a last revision ID or a date of last check
});

export type RunOptions = z.input<typeof runOptionsSchema>;

export class SparqlChangeChecker extends EventEmitter {
  private readonly endpointUrl: string;
  private readonly fetcher: SparqlEndpointFetcher;

  constructor(options: ConstructorOptions) {
    super();

    const opts = constructorOptionsSchema.parse(options);

    this.endpointUrl = opts.endpointUrl;
    this.fetcher = new SparqlEndpointFetcher({
      method: opts.endpointMethod,
      timeout: opts.timeoutPerRequest,
    });
  }

  private validateQuery(query: string) {
    // TBD: use sparqljs for validation?
    const bindings = ['?_this', '?_compareValue']; // Basil notation
    const hasBindings = bindings.every(
      binding => query.indexOf(binding) !== -1
    );
    if (!hasBindings) {
      throw new Error(`Bindings are missing in query: ${bindings.join(', ')}`);
    }

    return query;
  }

  async run(options: RunOptions) {
    const opts = runOptionsSchema.parse(options);

    const unparsedQuery = this.validateQuery(opts.query);

    // TBD: instead of doing string replacements, generate a new SPARQL query using sparqljs?
    const query = unparsedQuery
      .replaceAll('?_this', opts.iri)
      .replaceAll('?_compareValue', opts.compareValue.toString());

    const run = async () => this.fetcher.fetchAsk(this.endpointUrl, query);

    const isChanged = await pRetry(run, {
      retries: 3,
      onFailedAttempt: err => {
        const prettyError = new Error(
          `Failed to fetch results from SPARQL endpoint: ${err.message}`
        );
        prettyError.stack = err.stack;
        this.emit('warning', prettyError);
      },
    });

    return isChanged;
  }
}
