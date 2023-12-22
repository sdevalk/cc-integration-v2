#!/bin/env node

import {cac} from 'cac';
import type {Input} from './run.js';

const cli = cac();

cli
  .command('create', 'Create or update a graph by querying a SPARQL endpoint')
  .option('--resource-dir <string>', 'Directory for storing RDF resources')
  .option('--queue-file <string>', 'File with the queue')
  .option('--endpoint-url <string>', 'SPARQL endpoint URL')
  .option('--iterate-query-file <string>', 'File with a SPARQL query')
  .option(
    '--iterate-wait-between-requests [number]',
    'Wait between requests, in milliseconds'
  )
  .option(
    '--iterate-timeout-per-request [number]',
    'Timeout per request, in milliseconds'
  )
  .option(
    '--iterate-number-of-iris-per-request [number]',
    'Number of IRIs to collect per request'
  )
  .option('--generate-query-file <string>', 'File with a SPARQL query')
  .option(
    '--generate-wait-between-requests [number]',
    'Wait between requests, in milliseconds'
  )
  .option(
    '--generate-timeout-per-request [number]',
    'Timeout per request, in milliseconds'
  )
  .option(
    '--generate-number-of-concurrent-requests [number]',
    'Number of concurrent requests'
  )
  .option(
    '--generate-batch-size [number]',
    'Number of IRIs from the queue to process'
  )
  .action(async (input: Input) => {
    import('./run.js').then(action => action.run(input));
  });

cli.help();
cli.parse();
