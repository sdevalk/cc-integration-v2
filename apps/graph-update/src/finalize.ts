import PrettyMilliseconds from 'pretty-ms';
import {createActor, fromPromise} from 'xstate';

export const finalizer = fromPromise(({input}) => {
  // const finishTime = Date.now();
  // const runtime = finishTime - startTime;
  // logger.info(`Done in ${PrettyMilliseconds(runtime)}`);

  console.log('FINAL');
});

export const finalizeActor = createActor(finalizer);
