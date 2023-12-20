import {initialize} from './initialize.js';
import {finalize} from './finalize.js';
import {getLogger} from '@colonial-collections/common';
import type {Queue} from '@colonial-collections/queue';
import type {pino} from 'pino';
import {assign, createActor, setup} from 'xstate';
import {z} from 'zod';

const runOptionsSchema = z.object({
  endpointUrl: z.string(),
  queryFile: z.string(),
  waitBetweenRequests: z.number().optional(),
  numberOfIrisPerRequest: z.number().optional(),
  resourceDir: z.string(),
  queueFile: z.string(),
});

export type RunOptions = z.input<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const machine = setup({
    // https://stately.ai/docs/input#input-and-typescript
    types: {} as {
      input: RunOptions;
      context: RunOptions & {
        startTime: number;
        logger: pino.Logger;
        queue: Queue | undefined;
      };
      // https://stately.ai/docs/actors#actors-and-typescript
      // children: {} as {
      //   initialize: 'initialize';
      //   finalize: 'finalize';
      // };
    },
    actors: {
      initialize,
      finalize,
    },
  }).createMachine({
    id: 'updateGraph',
    initial: 'initialize',
    // https://stately.ai/docs/context#cheatsheet-input
    context: ({input}) => ({
      startTime: Date.now(),
      logger: getLogger(),
      queue: undefined,
      endpointUrl: input.endpointUrl,
      queryFile: input.queryFile,
      waitBetweenRequests: input.waitBetweenRequests,
      numberOfIrisPerRequest: input.numberOfIrisPerRequest,
      resourceDir: input.resourceDir,
      queueFile: input.queueFile,
    }),
    states: {
      initialize: {
        invoke: {
          id: 'initialize',
          src: 'initialize',
          // https://stately.ai/docs/invoke#input-from-a-function
          input: ({context}) => ({
            startTime: context.startTime,
            queueFile: context.queueFile,
          }),
          onDone: {
            target: 'finalize',
            // https://stately.ai/docs/context#updating-context-with-assign
            actions: assign({
              queue: ({event}) => event.output,
            }),
          },
        },
      },
      finalize: {
        invoke: {
          id: 'finalize',
          src: 'finalize',
          input: ({context}) => ({
            logger: context.logger,
            startTime: context.startTime,
            queue: context.queue,
          }),
          onDone: 'done',
        },
      },
      done: {
        type: 'final',
      },
    },
  });

  // https://stately.ai/docs/input#initial-event-input
  const mainActor = createActor(machine, {
    input: opts,
  });

  mainActor.start();
}
