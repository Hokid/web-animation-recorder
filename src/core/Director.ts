import {EngineFrames, EngineScreenshot} from './engine';
import {Logger} from './logger';

export class Director {
    constructor(
        private engine: EngineFrames & EngineScreenshot,
        private logger: Logger
    ) {
    }

    async makeAnimation(): Promise<void> {
        while (await this.engine.nextFrame()) {
            await this.engine.screenshot();
        }
    }
}
