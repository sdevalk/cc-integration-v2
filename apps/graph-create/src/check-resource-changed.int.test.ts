import {
  CheckIfResourceIsChangedInput,
  checkIfResourceIsChanged,
} from './check-resource-changed.js';
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

describe('checkIfResourceIsChanged', () => {
  it('returns true if there is no last run', async () => {
    const runs = new Runs({connection});

    const input: CheckIfResourceIsChangedInput = {
      logger,
      runs,
      endpointUrl: 'https://dbpedia.org/sparql',
      checkQueryFile: './fixtures/queries/change-check-dbpedia.rq',
      iriToCheckForChanges: 'http://dbpedia.org/resource/Netherlands',
    };

    const isChanged = await toPromise(
      createActor(checkIfResourceIsChanged, {input}).start()
    );

    expect(isChanged).toBe(true);
  });

  it('returns false if the resource is not changed since the last run', async () => {
    const runs = new Runs({connection});
    await runs.save({identifier: (1124717624 + 10000).toString()}); // Revision ID. Can change if the source data changes

    const input: CheckIfResourceIsChangedInput = {
      logger,
      runs,
      endpointUrl: 'https://dbpedia.org/sparql',
      checkQueryFile: './fixtures/queries/change-check-dbpedia.rq',
      iriToCheckForChanges: 'http://dbpedia.org/resource/Netherlands',
    };

    const isChanged = await toPromise(
      createActor(checkIfResourceIsChanged, {input}).start()
    );

    expect(isChanged).toBe(false);
  });

  it('returns true if the resources is changed since the last run', async () => {
    const runs = new Runs({connection});
    await runs.save({identifier: '1124717623'}); // Revision ID

    const input: CheckIfResourceIsChangedInput = {
      logger,
      runs,
      endpointUrl: 'https://dbpedia.org/sparql',
      checkQueryFile: './fixtures/queries/change-check-dbpedia.rq',
      iriToCheckForChanges: 'http://dbpedia.org/resource/Netherlands',
    };

    const isChanged = await toPromise(
      createActor(checkIfResourceIsChanged, {input}).start()
    );

    expect(isChanged).toBe(true);
  });
});
