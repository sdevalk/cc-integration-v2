import {dereference} from './dereference.js';
import {fileIterate} from './file-iterate.js';
import {getLogger} from '@colonial-collections/common';
import {Connection, Queue} from '@colonial-collections/datastore';
import {
  checkQueue,
  finalize,
  iterate,
  removeObsoleteResources,
  upload,
} from '@colonial-collections/xstate-actors';
import {join} from 'node:path';
import type {pino} from 'pino';
import {assign, createActor, setup, toPromise} from 'xstate';
import {z} from 'zod';

const inputSchema = z.object({
  resourceDir: z.string(),
  dataFile: z.string(),
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
  dereferenceBatchSize: z.number().default(750), // Mind the hourly and daily limits of GeoNames
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

  /*
    High-level workflow:
    If locations queue is empty and countries queue is empty: (start a new run)
      Collect IRIs of locations
    If locations queue is not empty:
      Update locations by dereferencing IRIs
      If locations queue is empty:
        Collect IRIs of countries
    If countries queue is not empty:
      Update countries by dereferencing IRIs
      If countries queue is empty:
        Upload to data platform
  */

  const workflow = setup({
    types: {} as {
      input: Input;
      context: Input & {
        startTime: number;
        logger: pino.Logger;
        queue: Queue;
        locationsResourceDir: string;
        locationsQueueSize: number;
        countriesResourceDir: string;
        countriesQueueSize: number;
      };
    },
    actors: {
      checkQueue,
      removeObsoleteResources,
      dereference,
      fileIterate,
      finalize,
      iterate,
      upload,
    },
  }).createMachine({
    id: 'main',
    initial: 'checkLocationsQueue',
    context: ({input}) => ({
      ...input,
      startTime: Date.now(),
      logger: getLogger(),
      queue,
      locationsResourceDir: join(input.resourceDir, 'locations'),
      locationsQueueSize: 0,
      countriesResourceDir: join(input.resourceDir, 'countries'),
      countriesQueueSize: 0,
    }),
    states: {
      checkLocationsQueue: {
        invoke: {
          id: 'checkLocationsQueue',
          src: 'checkQueue',
          input: ({context}) => ({
            queue: context.queue,
            type: 'locations',
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
            queue: context.queue,
            type: 'countries',
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
            target: 'updateLocations',
            guard: ({context}) => context.locationsQueueSize !== 0,
          },
          {
            target: 'updateCountries',
            guard: ({context}) => context.countriesQueueSize !== 0,
          },
          {
            target: 'finalize',
          },
        ],
      },
      initUpdateOfLocations: {
        initial: 'iterateLocations',
        states: {
          iterateLocations: {
            invoke: {
              id: 'iterateLocations',
              src: 'iterate',
              input: ({context}) => ({
                ...context,
                queue: context.queue,
                type: 'locations',
                iterateQueryFile: context.locationsIterateQueryFile,
              }),
              onDone: 'removeObsoleteLocations',
            },
          },
          removeObsoleteLocations: {
            invoke: {
              id: 'removeObsoleteLocations',
              src: 'removeObsoleteResources',
              input: ({context}) => ({
                ...context,
                queue: context.queue,
                type: 'locations',
                resourceDir: context.locationsResourceDir,
              }),
              onDone: '#main.finalize',
            },
          },
        },
      },
      updateLocations: {
        initial: 'dereferenceLocations',
        states: {
          dereferenceLocations: {
            invoke: {
              id: 'dereferenceLocations',
              src: 'dereference',
              input: ({context}) => ({
                ...context,
                queue: context.queue,
                type: 'locations',
                resourceDir: context.locationsResourceDir,
              }),
              onDone: 'checkLocationsQueue',
            },
          },
          checkLocationsQueue: {
            invoke: {
              id: 'checkLocationsQueue',
              src: 'checkQueue',
              input: ({context}) => ({
                queue: context.queue,
                type: 'locations',
              }),
              onDone: {
                target: 'evaluateLocationsQueue',
                actions: assign({
                  locationsQueueSize: ({event}) => event.output,
                }),
              },
            },
          },
          evaluateLocationsQueue: {
            always: [
              {
                target: '#main.initUpdateOfCountries',
                guard: ({context}) => context.locationsQueueSize === 0,
              },
              {
                target: '#main.finalize',
              },
            ],
          },
        },
      },
      initUpdateOfCountries: {
        initial: 'fileIterate',
        states: {
          fileIterate: {
            invoke: {
              id: 'fileIterate',
              src: 'fileIterate',
              input: ({context}) => ({
                ...context,
                queue: context.queue,
                type: 'countries',
                resourceDir: context.locationsResourceDir,
                iterateQueryFile: context.countriesIterateQueryFile,
              }),
              onDone: 'removeObsoleteCountries',
            },
          },
          removeObsoleteCountries: {
            invoke: {
              id: 'removeObsoleteCountries',
              src: 'removeObsoleteResources',
              input: ({context}) => ({
                ...context,
                queue: context.queue,
                type: 'countries',
                resourceDir: context.countriesResourceDir,
              }),
              onDone: '#main.finalize',
            },
          },
        },
      },
      updateCountries: {
        initial: 'dereferenceCountries',
        states: {
          dereferenceCountries: {
            invoke: {
              id: 'dereferenceCountries',
              src: 'dereference',
              input: ({context}) => ({
                ...context,
                queue: context.queue,
                type: 'countries',
                resourceDir: context.countriesResourceDir,
              }),
              onDone: 'checkCountriesQueue',
            },
          },
          checkCountriesQueue: {
            invoke: {
              id: 'checkCountriesQueue',
              src: 'checkQueue',
              input: ({context}) => ({
                queue: context.queue,
                type: 'countries',
              }),
              onDone: {
                target: 'evaluateCountriesQueue',
                actions: assign({
                  countriesQueueSize: ({event}) => event.output,
                }),
              },
            },
          },
          evaluateCountriesQueue: {
            always: [
              {
                // Only allowed to upload the generated resources if all items
                // in the queue have been processed
                target: 'upload',
                guard: ({context}) => context.countriesQueueSize === 0,
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
