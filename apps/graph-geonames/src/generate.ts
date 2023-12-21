import type {pino} from 'pino';
import {fromPromise} from 'xstate';

export const generate = fromPromise(
  async ({input}: {input: {startTime: number; logger: pino.Logger}}) => {
    console.log('GENERATE');
  }
);
