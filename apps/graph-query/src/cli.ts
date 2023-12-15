#!/bin/env node

import {cac} from 'cac';
import type {RunOptions as QueryRunOptions} from './query.js';

const cli = cac();

cli
  .command('query', 'Create or update graph by querying a SPARQL endpoint')
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
  .action(async (options: QueryRunOptions) => {
    import('./query.js').then(action =>
      action.run(options).catch(err => {
        console.error(err);
        process.exitCode = 1;
      })
    );
  });

cli.help();
cli.parse();
