import {finalizer, finalizeActor} from './finalize.js';
import {initializer, initializeActor} from './initialize.js';
import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {createMachine, createActor, setup} from 'xstate';
import {z} from 'zod';

// https://blog.logrocket.com/using-state-machines-with-xstate-and-react/

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

  // const queue = await Queue.new({path: opts.queueFile});

  // https://stately.ai/blog/2023-12-01-xstate-v5#stronger-type-inference
  const machine = setup({
    actors: {
      initializer,
      finalizer,
    },
  }).createMachine({
    id: 'updateGraph',
    // TODO: store event.input options
    entry: ({context, event}) => {
      // console.log(event.input);
    },
    initial: 'initialize',
    // https://stately.ai/docs/context#cheatsheet-lazy-initial-context
    context: () => ({
      startTime: Date.now(),
      logger: getLogger(),
    }),
    states: {
      initialize: {
        invoke: {
          src: 'initializer',
          // https://stately.ai/docs/invoke#input-from-a-function
          input: ({context, event}) => ({
            startTime: context.startTime,
          }),
          onDone: {
            target: 'finalize',
            actions: ({event}) => {
              console.log(event.output);
            },
          },
        },
      },
      // checkQueue: {
      //   invoke: {
      //     src: queueSize,
      //     input: ({context: {queue}}) => ({queue}),
      //     onDone: {
      //       target: 'success',
      //     },
      //   },
      // },
      // success: {},
      finalize: {
        invoke: {
          src: 'finalizer',
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
    // inspect: inspectionEvent => {
    //   console.log(inspectionEvent);
    // },
  });

  mainActor.start();
}
