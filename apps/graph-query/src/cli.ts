#!/bin/env node

import {cac} from 'cac';
import type {RunOptions} from './run.js';

const cli = cac();

cli
  .command('run', 'Create or update graph by querying a SPARQL endpoint')
  .option('--resource-dir <string>', 'Directory for storing RDF resources')
  .option('--queue-file <string>', 'File with the queue')
  .option('--endpoint-url <string>', 'SPARQL endpoint URL')
  .option('--query-file <string>', 'File with a SPARQL query')
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
  .option(
    '--timeout-per-request [number]',
    'Timeout per request, in milliseconds',
    {
      default: 60000,
    }
  )
  .option('--batch-size [number]', 'Number of IRIs from the queue to process', {
    default: 1000,
  })
  .option('--triplydb-instance-url <string>', 'TriplyDB instance URL')
  .option('--triplydb-api-token <string>', 'TriplyDB API token')
  .option('--triplydb-account <string>', 'TriplyDB account')
  .option('--triplydb-dataset <string>', 'TriplyDB dataset')
  .option('--triplydb-service-name <string>', 'TriplyDB service name')
  .option('--triplydb-service-type <string>', 'TriplyDB service type')
  .option(
    '--graph-name <string>',
    'Name of the graph to upload the RDF resources to'
  )
  .option('--dir-temp [string]', 'Directory for storing temporary files')
  .action(async (options: RunOptions) => {
    import('./run.js').then(action => action.run(options));
  });

cli.help();
cli.parse();
