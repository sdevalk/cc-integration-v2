import {generate} from './generate.js';
import {getLogger} from '@colonial-collections/common';
import {
  Connection,
  Queue,
  Registry,
  Runs,
} from '@colonial-collections/datastore';
import {
  checkQueue,
  finalize,
  iterate,
  registerRun,
  registerRunAndCheckIfRunMustContinue,
  removeObsoleteResources,
  upload,
} from '@colonial-collections/xstate-actors';
import type {pino} from 'pino';
import {assign, createActor, setup, toPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  resourceDir: z.string(),
  dataFile: z.string(),
  endpointUrl: z.string(),
  checkIfRunMustContinueQueryFile: z.string().optional(),
  checkIfRunMustContinueTimeout: z.number().optional(),
  iterateQueryFile: z.string(),
  iterateWaitBetweenRequests: z.number().default(500),
  iterateTimeoutPerRequest: z.number().optional(),
  iterateNumberOfIrisPerRequest: z.number().default(10000),
  generateQueryFile: z.string(),
  generateWaitBetweenRequests: z.number().default(100),
  generateTimeoutPerRequest: z.number().optional(),
  generateNumberOfConcurrentRequests: z.number().default(20), // ~ single-threaded max performance
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

  const connection = await Connection.new({path: opts.dataFile});
  const queue = new Queue({connection});
  const registry = new Registry({connection});
  const runs = new Runs({connection});

  /*
    High-level workflow:
    If queue is empty: (start a new run)
      If a 'must run continue' query file is set:
        Register run
        Check if run must continue
        If run must continue:
          Collect IRIs of resources
      Else:
        Register run
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
        registry: Registry;
        runs: Runs;
        continueRun: boolean;
      };
    },
    actors: {
      checkQueue,
      finalize,
      generate,
      iterate,
      registerRun,
      registerRunAndCheckIfRunMustContinue,
      removeObsoleteResources,
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
      registry,
      runs,
      continueRun: false,
    }),
    states: {
      // State 1a
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
      // State 1b
      evaluateQueue: {
        always: [
          {
            target: 'registerRunAndCheckIfRunMustContinue',
            guard: ({context}) =>
              context.queueSize === 0 &&
              context.checkIfRunMustContinueQueryFile !== undefined,
          },
          {
            target: 'registerRun',
            guard: ({context}) => context.queueSize === 0,
          },
          {
            target: 'updateResources',
          },
        ],
      },
      // State 2a
      registerRunAndCheckIfRunMustContinue: {
        invoke: {
          id: 'registerRunAndCheckIfRunMustContinue',
          src: 'registerRunAndCheckIfRunMustContinue',
          input: ({context}) => ({
            ...context,
            queryFile: context.checkIfRunMustContinueQueryFile!,
            timeout: context.checkIfRunMustContinueTimeout,
          }),
          onDone: {
            target: 'evaluateIfRunMustContinue',
            actions: assign({
              continueRun: ({event}) => event.output,
            }),
          },
        },
      },
      // State 2b
      evaluateIfRunMustContinue: {
        always: [
          {
            target: 'initUpdateOfResources',
            guard: ({context}) => context.continueRun,
          },
          {
            target: 'finalize',
          },
        ],
      },
      // State 3
      registerRun: {
        invoke: {
          id: 'registerRun',
          src: 'registerRun',
          input: ({context}) => context,
          onDone: 'initUpdateOfResources',
        },
      },
      // State 4
      initUpdateOfResources: {
        initial: 'iterate',
        states: {
          // State 4a
          iterate: {
            invoke: {
              id: 'iterate',
              src: 'iterate',
              input: ({context}) => ({
                ...context,
                queryFile: context.iterateQueryFile,
                waitBetweenRequests: context.iterateWaitBetweenRequests,
                timeoutPerRequest: context.iterateTimeoutPerRequest,
                numberOfIrisPerRequest: context.iterateNumberOfIrisPerRequest,
              }),
              onDone: 'removeObsoleteResources',
            },
          },
          // State 4b
          removeObsoleteResources: {
            invoke: {
              id: 'removeObsoleteResources',
              src: 'removeObsoleteResources',
              input: ({context}) => context,
              onDone: '#main.finalize',
            },
          },
        },
      },
      // State 5
      updateResources: {
        initial: 'generate',
        states: {
          // State 5a
          generate: {
            invoke: {
              id: 'generate',
              src: 'generate',
              input: ({context}) => ({
                ...context,
                queryFile: context.generateQueryFile,
                waitBetweenRequests: context.generateWaitBetweenRequests,
                timeoutPerRequest: context.generateTimeoutPerRequest,
                numberOfConcurrentRequests:
                  context.generateNumberOfConcurrentRequests,
                batchSize: context.generateBatchSize,
              }),
              onDone: 'checkQueue',
            },
          },
          // State 5b
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
          // State 5c
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
          // State 5d
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
      // State 6
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
