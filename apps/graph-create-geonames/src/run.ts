import {checkQueue} from './check-queue.js';
import {deleteObsoleteResources} from './delete-obsolete.js';
import {dereference} from './dereference.js';
import {fileIterate} from './file-iterate.js';
import {finalize} from './finalize.js';
import {iterate} from './iterate.js';
import {upload} from './upload.js';
import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import type {pino} from 'pino';
import {assign, createActor, setup} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  locationsResourceDir: z.string(),
  countriesResourceDir: z.string(),
  locationsQueueFile: z.string(),
  countriesQueueFile: z.string(),
  endpointUrl: z.string(),
  iterateLocationsQueryFile: z.string(),
  iterateWaitBetweenRequests: z.number().default(500),
  iterateTimeoutPerRequest: z.number().optional(),
  iterateNumberOfIrisPerRequest: z.number().default(10000),
  generateCredentials: z
    .object({
      type: z.literal('basic-auth'),
      username: z.string(),
      password: z.string(),
    })
    .optional(),
  generateHeaders: z.record(z.string(), z.string()).optional(),
  generateWaitBetweenRequests: z.number().default(100),
  generateTimeoutPerRequest: z.number().optional(),
  generateNumberOfConcurrentRequests: z.number().default(5),
  generateBatchSize: z.number().default(500), // Mind the hourly and daily limits of GeoNames
  iterateCountriesQueryFile: z.string(),
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

  const locationsQueue = await Queue.new({path: opts.locationsQueueFile});
  const countriesQueue = await Queue.new({path: opts.countriesQueueFile});

  /*
    If locationsQueue is empty AND countriesQueue is empty (a new run has begun)
      Fetch IRIs of locations
    If locationsQueue is not empty
      Deref IRIs of locations
    If countriesQueue is empty
      Fetch IRIs of countries
    If countriesQueue is not empty
      Deref IRIs of countries
      If countriesQueue is empty
        Upload
  */

  const workflow = setup({
    types: {} as {
      input: Input;
      context: Input & {
        startTime: number;
        logger: pino.Logger;
        locationsQueue: Queue;
        countriesQueue: Queue;
        locationsQueueSize: number;
        countriesQueueSize: number;
      };
    },
    actors: {
      checkQueue,
      deleteObsoleteResources,
      dereference,
      iterate,
      fileIterate,
      finalize,
      upload,
    },
  }).createMachine({
    id: 'keepGraphUpToDate',
    initial: 'checkLocationsQueue',
    context: ({input}) => ({
      ...input,
      startTime: Date.now(),
      logger: getLogger(),
      locationsQueue,
      countriesQueue,
      locationsQueueSize: 0,
      countriesQueueSize: 0,
    }),
    states: {
      checkLocationsQueue: {
        invoke: {
          id: 'checkLocationsQueue',
          src: 'checkQueue',
          input: ({context}) => ({
            queue: context.locationsQueue,
          }),
          onDone: {
            target: 'checkCountriesQueue',
            actions: assign({
              locationsQueueSize: ({event}) => event.output,
            }),
          },
        },
      },
      checkCountriesQueue: {
        invoke: {
          id: 'checkCountriesQueue',
          src: 'checkQueue',
          input: ({context}) => ({
            queue: context.countriesQueue,
          }),
          onDone: {
            target: 'evaluateQueues',
            actions: assign({
              countriesQueueSize: ({event}) => event.output,
            }),
          },
        },
      },
      evaluateQueues: {
        always: [
          {
            target: 'initUpdateOfLocations',
            guard: ({context}) =>
              context.locationsQueueSize === 0 &&
              context.countriesQueueSize === 0,
          },
          {
            target: 'dereferenceLocations',
            guard: ({context}) => context.locationsQueueSize !== 0,
          },
          {
            target: 'initUpdateOfCountries',
            guard: ({context}) => context.countriesQueueSize === 0,
          },
          {
            target: 'dereferenceCountries',
            guard: ({context}) => context.countriesQueueSize !== 0,
          },
          {
            target: 'finalize',
          },
        ],
      },
      initUpdateOfLocations: {
        initial: 'iterate',
        states: {
          iterate: {
            invoke: {
              id: 'iterate',
              src: 'iterate',
              input: ({context}) => ({
                ...context,
                queue: context.locationsQueue,
                iterateQueryFile: context.iterateLocationsQueryFile,
              }),
              onDone: 'deleteObsoleteLocations',
            },
          },
          deleteObsoleteLocations: {
            invoke: {
              id: 'deleteObsoleteLocations',
              src: 'deleteObsoleteResources',
              input: ({context}) => ({
                ...context,
                queue: context.locationsQueue,
                resourceDir: context.locationsResourceDir,
              }),
              onDone: '..finalize',
            },
          },
        },
      },
      dereferenceLocations: {
        invoke: {
          id: 'dereferenceLocations',
          src: 'dereference',
          input: ({context}) => ({
            ...context,
            queue: context.locationsQueue,
            resourceDir: context.locationsResourceDir,
          }),
          onDone: 'finalize',
        },
      },
      initUpdateOfCountries: {
        initial: 'fileIterate',
        states: {
          iterate: {
            invoke: {
              id: 'fileIterate',
              src: 'fileIterate',
              input: ({context}) => ({
                ...context,
                queue: context.countriesQueue,
                resourceDir: context.countriesResourceDir,
                iterateQueryFile: context.iterateCountriesQueryFile,
              }),
              onDone: 'deleteObsoleteCountries',
            },
          },
          deleteObsoleteCountries: {
            invoke: {
              id: 'deleteObsoleteCountries',
              src: 'deleteObsoleteResources',
              input: ({context}) => ({
                ...context,
                queue: context.countriesQueue,
                resourceDir: context.countriesResourceDir,
              }),
              onDone: '..finalize',
            },
          },
        },
      },
      dereferenceCountries: {
        invoke: {
          id: 'dereferenceCountries',
          src: 'dereference',
          input: ({context}) => ({
            ...context,
            queue: context.countriesQueue,
            resourceDir: context.countriesResourceDir,
          }),
          onDone: 'finalize',
        },
        // TODO: upload if countriesQueue is empty
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
