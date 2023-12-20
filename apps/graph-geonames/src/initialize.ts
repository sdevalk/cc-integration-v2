import {Queue} from '@colonial-collections/queue';
import {fromPromise} from 'xstate';

// https://stately.ai/docs/invoke#input-from-a-function
export const initialize = fromPromise(
  async ({input}: {input: {queueFile: string}}) => {
    console.log(input);

    console.log('INIT');

    const queue = await Queue.new({path: input.queueFile});

    return queue;
  }
);
