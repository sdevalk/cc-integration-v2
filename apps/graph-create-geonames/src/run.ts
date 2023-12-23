import {checkQueue} from './check-queue.js';
import {deleteObsoleteResources} from './delete-obsolete.js';
import {dereference} from './dereference.js';
import {fileIterate} from './file-iterate.js';
import {finalize} from './finalize.js';
import {iterate} from './iterate.js';
import {upload} from './upload.js';
import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {join} from 'node:path';
import type {pino} from 'pino';
import {assign, createActor, setup} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  resourceDir: z.string(),
  queueDir: z.string(),
  endpointUrl: z.string(),
  locationsIterateQueryFile: z.string(),
  countriesIterateQueryFile: z.string(),
  iterateWaitBetweenRequests: z.number().default(500),
  iterateTimeoutPerRequest: z.number().optional(),
  iterateNumberOfIrisPerRequest: z.number().default(10000),
  dereferenceCredentials: z
    .object({
      type: z.literal('basic-auth'),
      username: z.string(),
      password: z.string(),
    })
    .optional(),
  dereferenceHeaders: z.record(z.string(), z.string()).optional(),
  dereferenceWaitBetweenRequests: z.number().default(100),
  dereferenceTimeoutPerRequest: z.number().optional(),
  dereferenceNumberOfConcurrentRequests: z.number().default(5),
  dereferenceBatchSize: z.number().default(500), // Mind the hourly and daily limits of GeoNames
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

  const locationsQueue = await Queue.new({
    path: join(opts.queueDir, 'locations.sqlite'),
  });
  const countriesQueue = await Queue.new({
    path: join(opts.queueDir, 'countries.sqlite'),
  });

  /*
    Workflow:
    If locationsQueue is empty and countriesQueue is empty: (start a new run)
      Collect IRIs of locations
    If locationsQueue is not empty:
      Dereference IRIs of locations
    If countriesQueue is empty:
      Collect IRIs of countries
    If countriesQueue is not empty:
      Dereference IRIs of countries
      If countriesQueue is empty:
        Upload to data platform
  */

  const workflow = setup({
    types: {} as {
      input: Input;
      context: Input & {
        startTime: number;
        logger: pino.Logger;
        locationsResourceDir: string;
        locationsQueue: Queue;
        locationsQueueSize: number;
        countriesResourceDir: string;
        countriesQueue: Queue;
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
      locationsResourceDir: join(input.resourceDir, 'locations'),
      countriesResourceDir: join(input.resourceDir, 'countries'),
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
                iterateQueryFile: context.locationsIterateQueryFile,
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
          // TODO: add check - if locationsQueue is empty, go to initUpdateOfCountries
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
                iterateQueryFile: context.countriesIterateQueryFile,
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
