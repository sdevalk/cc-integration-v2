import {Runs} from '@colonial-collections/datastore';
import {SparqlChangeChecker} from '@colonial-collections/sparql-change-checker';
import {readFile} from 'node:fs/promises';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  runs: z.instanceof(Runs),
  endpointUrl: z.string().url(),
  checkQueryFile: z.string(),
  checkTimeoutPerRequest: z.number().optional(),
  iriToCheckForChanges: z.string(),
});

export type CheckIfResourceIsChangedInput = z.input<typeof inputSchema>;

export const checkIfResourceIsChanged = fromPromise(
  async ({input}: {input: CheckIfResourceIsChangedInput}) => {
    const opts = inputSchema.parse(input);

    opts.logger.info(
      `Checking whether resource "${opts.iriToCheckForChanges}" is changed in SPARQL endpoint "${opts.endpointUrl}"`
    );

    const lastRun = await opts.runs.getLastRun();

    // If there is no last run, assume a first run must be started
    if (lastRun === undefined) {
      opts.logger.info(
        'Cannot check whether resource "${opts.iriToCheckForChanges}" is changed: no last run found'
      );
      return true;
    }

    const query = await readFile(opts.checkQueryFile, 'utf-8');
    const checker = new SparqlChangeChecker({
      endpointUrl: opts.endpointUrl,
      timeoutPerRequest: opts.checkTimeoutPerRequest,
    });

    const isChanged = await checker.run({
      query,
      iri: opts.iriToCheckForChanges,
      compareValue: lastRun.identifier,
    });

    opts.logger.info(
      `Resource "${opts.iriToCheckForChanges}" is ${
        isChanged ? '' : 'not'
      } changed`
    );

    return isChanged;
  }
);
