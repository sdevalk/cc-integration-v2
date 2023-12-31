import {RegisterRunInput, registerRun} from './register-run.js';
import {Connection, Runs} from '@colonial-collections/datastore';
import {join} from 'node:path';
import {rimraf} from 'rimraf';
import {pino} from 'pino';
import {beforeEach, describe, expect, it} from 'vitest';
import {createActor, toPromise} from 'xstate';

const tmpDir = './tmp';
const dataFile = join(tmpDir, 'data.sqlite');
const logger = pino();
let connection: Connection;

beforeEach(async () => {
  await rimraf(tmpDir);
  connection = await Connection.new({path: dataFile});
});

describe('registerRun', () => {
  it('returns true if there is no last run', async () => {
    const runs = new Runs({connection});

    const input: RegisterRunInput = {
      logger,
      runs,
      endpointUrl: 'https://dbpedia.org/sparql',
      mustRunQueryFile: './fixtures/queries/change-check-dbpedia.rq',
      iriToCheckForChanges: 'http://dbpedia.org/resource/Netherlands',
    };

    const mustRun = await toPromise(createActor(registerRun, {input}).start());

    expect(mustRun).toBe(true);
  });

  it('returns false if the resource is not changed since the last run', async () => {
    const runs = new Runs({connection});
    await runs.save({identifier: (1124717624 + 10000).toString()}); // Revision ID. Can change if the source data changes

    const input: RegisterRunInput = {
      logger,
      runs,
      endpointUrl: 'https://dbpedia.org/sparql',
      mustRunQueryFile: './fixtures/queries/change-check-dbpedia.rq',
      iriToCheckForChanges: 'http://dbpedia.org/resource/Netherlands',
    };

    const mustRun = await toPromise(createActor(registerRun, {input}).start());

    expect(mustRun).toBe(false);
  });

  it('returns true if the resources is changed since the last run', async () => {
    const runs = new Runs({connection});
    await runs.save({identifier: '1124717623'}); // Revision ID

    const input: RegisterRunInput = {
      logger,
      runs,
      endpointUrl: 'https://dbpedia.org/sparql',
      mustRunQueryFile: './fixtures/queries/change-check-dbpedia.rq',
      iriToCheckForChanges: 'http://dbpedia.org/resource/Netherlands',
    };

    const mustRun = await toPromise(createActor(registerRun, {input}).start());

    expect(mustRun).toBe(true);
  });
});
