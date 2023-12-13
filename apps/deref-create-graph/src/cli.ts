#!/bin/env node

import {cac} from 'cac';
import type {RunOptions} from './runner.js';

const cli = cac();

cli
  .command('run', 'Collect IRIs from a SPARQL endpoint')
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
