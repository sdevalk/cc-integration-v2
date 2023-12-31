#!/bin/env node

import {cac} from 'cac';
import type {Input} from './run.js';

const cli = cac();

cli
  .command('create', 'Create or update a graph by querying a SPARQL endpoint')
  .option('--resource-dir <string>', 'Directory for storing RDF resources')
  .option('--data-file <string>', 'File with data')
  .option('--endpoint-url <string>', 'SPARQL endpoint URL')
  .option('--check-query-file <string>', 'File with a SPARQL query')
  .option(
    '--check-timeout-per-request [number]',
    'Timeout per request, in milliseconds'
  )
  .option(
    '--iri-to-check-for-changes [string]',
    'IRI of a resource to check for changes'
  )
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
  .option('--temp-dir [string]', 'Directory for storing temporary files')
  .action(async (input: Input) => {
    import('./run.js').then(action => action.run(input));
  });

cli.help();
cli.parse();
