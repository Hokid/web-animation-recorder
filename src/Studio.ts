import {Config} from './core/config';
import {Director} from './core/Director';
import {Engine} from './core/engine';
import {Output} from './core/output';
import {PuppeteerEngine} from './engines/puppeteer';
import {Logger} from './core/logger';

export class Studio {
    private readonly director: Director;
    private readonly engine: Engine;
    private readonly output: Output;
    private readonly outputFinished: Promise<void>;
    private logger: Logger;

    constructor(private config: Config) {
        this.logger = new Logger({
            level: config.logsLevel,
            collect: !!config.outputLogsToJSON
        });
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
        this.outputFinished = new Promise((resolve, reject) => {
            this.output.on('finish', resolve);
            this.output.on('error', reject);
        });
        this.director = new Director(this.engine, this.logger);
    }

    async makeAnimation(): Promise<void | object[]> {
        this.logger.log(this.constructor.name, 'making animation...');

        try {
            await this.engine.open();
            const screenshotsStream = this.engine.getScreenshotStream();
            screenshotsStream.pipe(this.output);
            await this.director.makeAnimation();
            await this.engine.reset();
            await this.engine.close();
            await this.outputFinished;
            this.logger.log(this.constructor.name, 'done!');
        } catch (error) {
            this.logger.error(this.constructor.name, error);
        }

        if (this.config.outputLogsToJSON) {
            return this.logger.flushLogs();
        }
    }
}
