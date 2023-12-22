import PrettyMilliseconds from 'pretty-ms';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
  startTime: z.number(),
});

export type Input = z.input<typeof inputSchema>;

export const finalize = fromPromise(async ({input}: {input: Input}) => {
  const opts = inputSchema.parse(input);

  const finishTime = Date.now();
  const runtime = finishTime - opts.startTime;
  opts.logger.info(`Done in ${PrettyMilliseconds(runtime)}`);
});
