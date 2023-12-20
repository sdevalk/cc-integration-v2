import type {pino} from 'pino';
import PrettyMilliseconds from 'pretty-ms';
import {fromPromise} from 'xstate';

export const finalize = fromPromise(
  async ({input}: {input: {startTime: number; logger: pino.Logger}}) => {
    const {startTime, logger} = input;

    const finishTime = Date.now();
    const runtime = finishTime - startTime;
    logger.info(`Done in ${PrettyMilliseconds(runtime)}`);

    console.log('FINAL');
  }
);
