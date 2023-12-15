import type {pino} from 'pino';
import PrettyMilliseconds from 'pretty-ms';
import {z} from 'zod';

const constructorOptionsSchema = z.object({
  logger: z.any(),
  startTime: z.number(),
  totalNumberOfResources: z.number().int(),
});

export type ConstructorOptions = z.infer<typeof constructorOptionsSchema>;

export class ProgressLogger {
  private readonly logger: pino.Logger;
  private readonly startTime: number;
  private readonly totalNumberOfResources: number;
  private numberOfProcessedResources = 0;
  private prevProgressPercentage = -1;

  constructor(options: ConstructorOptions) {
    const opts = constructorOptionsSchema.parse(options);

    this.logger = opts.logger;
    this.startTime = opts.startTime;
    this.totalNumberOfResources = opts.totalNumberOfResources;
  }

  log() {
    this.numberOfProcessedResources++;
    const currentProgressPercentage = Math.round(
      (this.numberOfProcessedResources / this.totalNumberOfResources) * 100
    );

    // Only log a given percentage once, to not overflow the logs
    if (this.prevProgressPercentage === currentProgressPercentage) {
      return;
    }

    const intermediateTime = Date.now();
    const runtime = intermediateTime - this.startTime;

    this.logger.info(
      `Generated ${currentProgressPercentage}% of ${
        this.totalNumberOfResources
      } resources (runtime: ${PrettyMilliseconds(runtime)})`
    );

    this.prevProgressPercentage = currentProgressPercentage;
  }
}
