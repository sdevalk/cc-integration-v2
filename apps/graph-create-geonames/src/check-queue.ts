import {Queue} from '@colonial-collections/queue';
import {fromPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  queue: z.instanceof(Queue),
});

export type Input = z.input<typeof inputSchema>;

export const checkQueue = fromPromise(async ({input}: {input: Input}) => {
  const opts = inputSchema.parse(input);

  return opts.queue.size();
});
