#!/bin/env node

import {ConfigStore} from '@colonial-collections/config-store';
import {cac} from 'cac';
import {z} from 'zod';

const runOptionsSchema = z.object({
  configFile: z.string(),
});

export type RunOptions = z.input<typeof runOptionsSchema>;

const cli = cac();

cli
  .command('run', 'Collect and queue IRIs from a SPARQL endpoint')
  .option('--config-file <string>', 'File with a configuration')
  .action(async (options: RunOptions) => {
    const runOpts = runOptionsSchema.parse(options);
    const configStore = await ConfigStore.fromFile(runOpts.configFile);
    const configOpts = configStore.get('/');

    import('./run.js').then(action => action.run(configOpts));
  });

cli.help();
cli.parse();
