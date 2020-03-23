import {Config} from './core/config';
import {Director} from './core/Director';
import {Engine} from './core/engine';
import {Output} from './core/output';
import {PuppeteerEngine} from './engines/puppeteer';
import {Logger} from './core/logger';
import * as fs from 'fs';

export class Studio {
    private readonly director: Director;
    private readonly engine: Engine;
    private readonly output: Output;
    private logger: Logger = new Logger(true);

    constructor(private config: Config) {
        this.engine = new PuppeteerEngine({
            url: config.url,
            target: config.target,
            duration: config.duration,
            delay: config.delay,
            fps: config.fps,
            logger: this.logger
        });
        const {type: OutputCtr, ...outputArgs} = config.output;
        outputArgs.logger = this.logger;
        this.output = new OutputCtr(outputArgs);
        this.director = new Director(this.engine, this.logger);
    }

    async makeAnimation(): Promise<void> {
        await this.engine.open();
        const screenshotsStream = this.engine.getScreenshotStream();
        screenshotsStream.pipe(this.output);
        await this.director.makeAnimation();
        await this.engine.reset();
        await this.engine.close();
        await fs.promises.writeFile(process.cwd() + '/' + Date.now() + '.json', JSON.stringify(this.logger.flushLogs(), null, 2));
    }
}
