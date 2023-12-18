import {getLogger} from '@colonial-collections/common';
import {Queue} from '@colonial-collections/queue';
import {createActor, fromPromise} from 'xstate';

// https://stately.ai/docs/invoke#input-from-a-function
export const initializer = fromPromise(({input}) => {
  console.log(input);

  // const startTime = Date.now();
  // const logger = getLogger();
  // const queue = await Queue.new({path: opts.queueFile});
  console.log('INIT');

  return 123;
});

export const initializeActor = createActor(initializer);
