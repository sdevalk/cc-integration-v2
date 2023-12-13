#!/bin/env node

import {cac} from 'cac';
import type {RunOptions} from './runner.js';

const cli = cac();

cli
  .command('sparql-iterate', 'Collect IRIs from a SPARQL endpoint')
  .option('--endpoint-url <string>', 'SPARQL endpoint URL')
  .option('--query-file <string>', 'File with a SPARQL query')
  .option(
    '--wait-between-requests [number]',
    'Wait between requests, in milliseconds',
    {
      default: 0,
    }
  )
  .option(
    '--number-of-iris-per-request [number]',
    'Number of IRIs to collect per request',
    {default: 1000}
  )
  .option(
    '--resource-dir <string>',
    'Directory for storing RDF resources of collected IRIs'
  )
  .option('--queue-file <string>', 'File with the queue')
  .action(async (options: RunOptions) => {
    import('./runner.js').then(action => action.run(options));
  });

cli.help();
cli.parse();
