import {Queue} from '@colonial-collections/queue';
import {fromPromise} from 'xstate';

// https://github.com/statelyai/xstate/blob/main/examples/fetch/src/index.ts
// https://stately.ai/docs/invoke#input-from-a-function
export const initialize = fromPromise(
  async ({input}: {input: {queueFile: string}}) => {
    console.log(input);

    console.log('INIT');

    const queue = await Queue.new({path: input.queueFile});
    const isEmpty = await queue.isEmpty();

    return {queue, isEmpty};
  }
);
