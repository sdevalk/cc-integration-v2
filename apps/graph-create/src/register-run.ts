import {Runs} from '@colonial-collections/datastore';
import {SparqlChangeChecker} from '@colonial-collections/sparql-change-checker';
import {readFile} from 'node:fs/promises';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const registerRunInputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  runs: z.instanceof(Runs),
});

export type RegisterRunInput = z.input<typeof registerRunInputSchema>;

export const registerRun = fromPromise(
  async ({input}: {input: RegisterRunInput}) => {
    const opts = registerRunInputSchema.parse(input);

    opts.runs.save({}); // FIXME: allow for empty

    return true;
  }
);

const registerRunByCheckingIfRunMustRunInputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  runs: z.instanceof(Runs),
  endpointUrl: z.string().url(),
  mustRunQueryFile: z.string(),
  mustRunTimeout: z.number().optional(),
});

export type RegisterRunByCheckingIfRunMustRunInput = z.input<
  typeof registerRunByCheckingIfRunMustRunInputSchema
>;

export const registerRunByCheckingIfRunMustRun = fromPromise(
  async ({input}: {input: RegisterRunByCheckingIfRunMustRunInput}) => {
    const opts = registerRunByCheckingIfRunMustRunInputSchema.parse(input);

    const lastRun = await opts.runs.getLastRun();

    const query = await readFile(opts.mustRunQueryFile, 'utf-8');
    const checker = new SparqlChangeChecker({
      endpointUrl: opts.endpointUrl,
      timeout: opts.mustRunTimeout,
    });

    const response = await checker.run({
      query,
      currentIdentifier: lastRun?.identifier,
    });

    const mustRun = response.isChanged;
    opts.runs.save({identifier: response.identifier});

    return mustRun;
  }
);
