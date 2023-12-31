import {Runs} from '@colonial-collections/datastore';
import {SparqlChangeChecker} from '@colonial-collections/sparql-change-checker';
import {readFile} from 'node:fs/promises';
import {fromPromise} from 'xstate';
import {z} from 'zod';

// Deze params optioneel maken: als ze niet geset zijn, dan moet de run altijd starten
const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  runs: z.instanceof(Runs),
  endpointUrl: z.string().url(),
  mustRunQueryFile: z.string(),
  mustRunTimeout: z.number().optional(),
  iriToCheckForChanges: z.string(),
});

export type RegisterRunInput = z.input<typeof inputSchema>;

export const registerRun = fromPromise(
  async ({input}: {input: RegisterRunInput}) => {
    const opts = inputSchema.parse(input);

    opts.logger.info('Checking whether run must run');

    const lastRun = await opts.runs.getLastRun();

    // If there is no last run, assume a first run must be started
    if (lastRun === undefined) {
      opts.logger.info('No last run found');

      // If mustRunQuery is set:
      //    Always execute the mustRunQuery, to get the initial value (e.g. first revision ID or date of modification)

      return true;
    }

    const query = await readFile(opts.mustRunQueryFile, 'utf-8');
    const checker = new SparqlChangeChecker({
      endpointUrl: opts.endpointUrl,
      timeoutPerRequest: opts.mustRunTimeout,
    });

    const mustRun = await checker.run({
      query,
      iri: opts.iriToCheckForChanges,
      compareValue: lastRun.identifier,
    });

    opts.runs.save({identifier: 'XXX'}); // The return value of the checker

    return mustRun;
  }
);
