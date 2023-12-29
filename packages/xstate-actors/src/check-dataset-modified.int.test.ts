import {
  CheckIfDatasetHasBeenModifiedInput,
  checkIfDatasetHasBeenModified,
} from './check-dataset-modified.js';
import {pino} from 'pino';
import {describe, expect, it} from 'vitest';
import {createActor, toPromise} from 'xstate';

describe('checkIfDatasetHasBeenModified', () => {
  it('errors if the endpoint is invalid', async () => {
    expect.assertions(1);

    const input: CheckIfDatasetHasBeenModifiedInput = {
      logger: pino(),
      endpointUrl: 'http://localhost',
      datasetId: 'http://localhost',
      dateLastRun: new Date(),
    };

    try {
      await toPromise(
        createActor(checkIfDatasetHasBeenModified, {input}).start()
      );
    } catch (err) {
      const error = err as Error;
      expect(error.message).toEqual('fetch failed');
    }
  });

  it('returns true if the dataset has been modified since the last run', async () => {
    const input: CheckIfDatasetHasBeenModifiedInput = {
      logger: pino(),
      endpointUrl:
        'https://api.colonialcollections.nl/datasets/data-hub/knowledge-graph/services/kg/sparql',
      datasetId: 'https://linkeddata.cultureelerfgoed.nl/rce/colonialobjects',
      dateLastRun: new Date('1970-01-01'), // Some date far in the past
    };

    const isModified = await toPromise(
      createActor(checkIfDatasetHasBeenModified, {input}).start()
    );

    expect(isModified).toBe(true);
  });

  it('returns false if the dataset has not been modified since the last run', async () => {
    const input: CheckIfDatasetHasBeenModifiedInput = {
      logger: pino(),
      endpointUrl:
        'https://api.colonialcollections.nl/datasets/data-hub/knowledge-graph/services/kg/sparql',
      datasetId: 'https://linkeddata.cultureelerfgoed.nl/rce/colonialobjects',
      dateLastRun: new Date(), // 'Now'
    };

    const isModified = await toPromise(
      createActor(checkIfDatasetHasBeenModified, {input}).start()
    );

    expect(isModified).toBe(false);
  });
});
