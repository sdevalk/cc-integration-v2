import type {pino} from 'pino';
import {fromPromise} from 'xstate';

export const query = fromPromise(
  async ({input}: {input: {startTime: number; logger: pino.Logger}}) => {
    console.log('QUERY');
  }
);
