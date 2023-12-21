import {checkQueue, finalize, generate, iterate} from './actors.js';
import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import type {pino} from 'pino';
import {assign, createActor, setup} from 'xstate';
import {z} from 'zod';

const runOptionsSchema = z.object({
  endpointUrl: z.string(),
  iterateQueryFile: z.string(),
  generateQueryFile: z.string(),
  waitBetweenRequests: z.number().optional(),
  numberOfIrisPerRequest: z.number().optional(),
  resourceDir: z.string(),
  queueFile: z.string(),
});

export type RunOptions = z.input<typeof runOptionsSchema>;

export async function run(options: RunOptions) {
  const opts = runOptionsSchema.parse(options);

  const queue = await Queue.new({path: opts.queueFile});

  const workflow = setup({
    types: {} as {
      input: RunOptions;
      context: RunOptions & {
        startTime: number;
        logger: pino.Logger;
        queue: Queue;
        queueSize: number;
      };
    },
    actors: {
      checkQueue,
      generate,
      iterate,
      finalize,
    },
  }).createMachine({
    id: 'keepGraphUpToDate',
    initial: 'checkQueue',
    context: ({input}) => ({
      startTime: Date.now(),
      logger: getLogger(),
      queue,
      queueSize: 0,
      endpointUrl: input.endpointUrl,
      iterateQueryFile: input.iterateQueryFile,
      generateQueryFile: input.generateQueryFile,
      waitBetweenRequests: input.waitBetweenRequests,
      numberOfIrisPerRequest: input.numberOfIrisPerRequest,
      resourceDir: input.resourceDir,
      queueFile: input.queueFile,
    }),
    states: {
      checkQueue: {
        invoke: {
          id: 'checkQueue',
          src: 'checkQueue',
          input: ({context}) => context,
          onDone: {
            target: 'evaluateQueue',
            actions: assign({
              queueSize: ({event}) => event.output,
            }),
          },
        },
      },
      evaluateQueue: {
        always: [
          // If the queue is empty: fill it by iterating
          {
            target: 'iterate',
            guard: ({context}) => context.queueSize === 0,
          },
          // If the queue is not empty: generate resources in the queue
          {
            target: 'generate',
          },
        ],
      },
      iterate: {
        invoke: {
          id: 'iterate',
          src: 'iterate',
          input: ({context}) => context,
          onDone: 'finalize',
        },
      },
      generate: {
        invoke: {
          id: 'generate',
          src: 'generate',
          input: ({context}) => context,
          onDone: 'finalize',
        },
      },
      finalize: {
        invoke: {
          id: 'finalize',
          src: 'finalize',
          input: ({context}) => context,
          onDone: 'done',
        },
      },
      done: {
        type: 'final',
      },
    },
  });

  createActor(workflow, {input: opts}).start();
}
