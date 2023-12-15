#!/bin/env node

import {cac} from 'cac';
import type {RunOptions as DeferenceRunOptions} from './dereference.js';
import type {RunOptions as UploadRunOptions} from './upload.js';

const cli = cac();

cli
  .command('dereference', 'Create or update graph by dereferencing IRIs')
  .option('--resource-dir <string>', 'Directory for storing RDF resources')
  .option('--queue-file <string>', 'File with the queue')
  .option(
    '--number-of-concurrent-requests [number]',
    'Number of concurrent requests',
    {
      default: 1,
    }
  )
  .option(
    '--wait-between-requests [number]',
    'Wait between requests, in milliseconds',
    {
      default: 0,
    }
  )
  .option('--batch-size [number]', 'Number of IRIs from the queue to process', {
    default: 1000,
  })
  .action(async (options: DeferenceRunOptions) => {
    import('./dereference.js').then(action =>
      action.run(options).catch(err => {
        console.error(err);
        process.exitCode = 1;
      })
    );
  });

cli
  .command('upload', 'Upload graph to data platform')
  .option('--resource-dir <string>', 'Directory with RDF resources to upload')
  .option('--queue-file <string>', 'File with the queue')
  .option('--triplydb-instance-url <string>', 'TriplyDB instance URL')
  .option('--triplydb-api-token <string>', 'TriplyDB API token')
  .option('--triplydb-account <string>', 'TriplyDB account')
  .option('--triplydb-dataset <string>', 'TriplyDB dataset')
  .option('--triplydb-service-name <string>', 'TriplyDB service name')
  .option('--triplydb-service-type <string>', 'TriplyDB service type')
  .option('--dir-temp [string]', 'Directory for storing temporary files')
  .option(
    '--graph-name <string>',
    'Name of the graph to upload the RDF resources to'
  )
  .action(async (options: UploadRunOptions) => {
    import('./upload.js').then(action =>
      action.run(options).catch(err => {
        console.error(err);
        process.exitCode = 1;
      })
    );
  });

cli.help();
cli.parse();
