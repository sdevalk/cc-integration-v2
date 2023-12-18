import type {pino} from 'pino';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const constructorOptionsSchema = z.object({
  logger: z.any().refine(val => val !== undefined, {
    message: 'logger must be defined',
  }),
});

export type ConstructorOptions = z.infer<typeof constructorOptionsSchema>;

const logOptionsSchema = z.object({
  startTime: z.number().int(),
  totalNumberOfResources: z.number().int(),
  numberOfProcessedResources: z.number().int(),
});

export type LogOptions = z.infer<typeof logOptionsSchema>;

export class ProgressLogger {
  private readonly logger: pino.Logger;
  private prevProgressPercentage = -1;

  constructor(options: ConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    this.logger = opts.logger;
  }

  log(options: LogOptions) {
    const opts = logOptionsSchema.parse(options);

    const currentProgressPercentage = Math.round(
      (opts.numberOfProcessedResources / opts.totalNumberOfResources) * 100
    );

    // Only log a given percentage once, to not overflow the logs
    if (this.prevProgressPercentage === currentProgressPercentage) {
      return;
    }

    const intermediateTime = Date.now();
    const runtime = intermediateTime - opts.startTime;

    this.logger.info(
      `Generated ${currentProgressPercentage}% of ${
        opts.totalNumberOfResources
      } resources (runtime: ${PrettyMilliseconds(runtime)})`
    );

    this.prevProgressPercentage = currentProgressPercentage;
  }
}
