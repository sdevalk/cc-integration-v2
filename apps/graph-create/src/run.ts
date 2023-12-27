import {checkQueue} from './check-queue.js';
import {deleteObsoleteResources} from './delete-obsolete.js';
import {finalize} from './finalize.js';
import {generate} from './generate.js';
import {iterate} from './iterate.js';
import {upload} from './upload.js';
import {getLogger} from '@colonial-collections/common';
import {Connection, Queue} from '@colonial-collections/datastore';
import {join} from 'node:path';
import type {pino} from 'pino';
import {assign, createActor, setup, toPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  resourceDir: z.string(),
  dataDir: z.string(),
  endpointUrl: z.string(),
  iterateQueryFile: z.string(),
  iterateWaitBetweenRequests: z.number().default(500),
  iterateTimeoutPerRequest: z.number().optional(),
  iterateNumberOfIrisPerRequest: z.number().default(10000),
  generateQueryFile: z.string(),
  generateWaitBetweenRequests: z.number().default(100),
  generateTimeoutPerRequest: z.number().optional(),
  generateNumberOfConcurrentRequests: z.number().default(20), // Single-threaded
  generateBatchSize: z.number().default(50000),
  triplydbInstanceUrl: z.string(),
  triplydbApiToken: z.string(),
  triplydbAccount: z.string(),
  triplydbDataset: z.string(),
  triplydbServiceName: z.string(),
  triplydbServiceType: z.string(),
  graphName: z.string(),
  tempDir: z.string().optional(),
});

export type Input = z.input<typeof inputSchema>;

export async function run(input: Input) {
  const opts = inputSchema.parse(input);

  const dataFile = join(opts.dataDir, 'data.sqlite');
  const connection = await Connection.new({path: dataFile});
  const queue = new Queue({connection});

  /*
    High-level workflow:
    If queue is empty: (start a new run)
      Collect IRIs of resources
    If queue is not empty:
      Updates resources by querying a SPARQL endpoint with their IRIs
      If queue is empty:
        Upload to data platform
  */

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
      upload,
    },
  }).createMachine({
    id: 'main',
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
            target: 'initUpdateOfResources',
            guard: ({context}) => context.queueSize === 0,
          },
          {
            target: 'updateResources',
          },
        ],
      },
      initUpdateOfResources: {
        initial: 'iterate',
        states: {
          iterate: {
            invoke: {
              id: 'iterate',
              src: 'iterate',
              input: ({context}) => context,
              onDone: 'deleteObsoleteResources',
            },
          },
          deleteObsoleteResources: {
            invoke: {
              id: 'deleteObsoleteResources',
              src: 'deleteObsoleteResources',
              input: ({context}) => context,
              onDone: '#main.finalize',
            },
          },
        },
      },
      updateResources: {
        initial: 'generate',
        states: {
          generate: {
            invoke: {
              id: 'generate',
              src: 'generate',
              input: ({context}) => context,
              onDone: 'checkQueue',
            },
          },
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
                // Only allowed to upload the generated resources if all items
                // in the queue have been processed
                target: 'upload',
                guard: ({context}) => context.queueSize === 0,
              },
              {
                target: '#main.finalize',
              },
            ],
          },
          // This action fails if another process is already
          // uploading resources to the data platform
          upload: {
            invoke: {
              id: 'upload',
              src: 'upload',
              input: ({context}) => context,
              onDone: '#main.finalize',
            },
          },
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

  await toPromise(createActor(workflow, {input: opts}).start());
}
