import {checkQueue} from './check-queue.js';
import {deleteObsoleteResources} from './delete-obsolete.js';
import {finalize} from './finalize.js';
import {generate} from './generate.js';
import {iterate} from './iterate.js';
import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import type {pino} from 'pino';
import {assign, createActor, setup} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  resourceDir: z.string(),
  queueFile: z.string(),
  endpointUrl: z.string(),
  iterateQueryFile: z.string(),
  iterateWaitBetweenRequests: z.number().optional(),
  iterateTimeoutPerRequest: z.number().optional(),
  iterateNumberOfIrisPerRequest: z.number().optional(),
  generateQueryFile: z.string(),
  generateWaitBetweenRequests: z.number().optional(),
  generateTimeoutPerRequest: z.number().optional(),
  generateNumberOfConcurrentRequests: z.number().optional(),
  generateBatchSize: z.number().optional(),
});

export type Input = z.input<typeof inputSchema>;

export async function run(input: Input) {
  const opts = inputSchema.parse(input);

  const queue = await Queue.new({path: opts.queueFile});

  const workflow = setup({
    types: {} as {
      input: Input;
      context: Input & {
        startTime: number;
        logger: pino.Logger;
        queue: Queue;
        queueSize: number;
      };
    },
    actors: {
      checkQueue,
      deleteObsoleteResources,
      generate,
      iterate,
      finalize,
    },
  }).createMachine({
    id: 'keepGraphUpToDate',
    initial: 'checkQueue',
    context: ({input}) => ({
      ...input,
      startTime: Date.now(),
      logger: getLogger(),
      queue,
      queueSize: 0,
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
          {
            target: 'iterate',
            guard: ({context}) => context.queueSize === 0,
          },
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
          onDone: 'deleteObsolete',
        },
      },
      deleteObsolete: {
        invoke: {
          id: 'deleteObsolete',
          src: 'deleteObsoleteResources',
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
