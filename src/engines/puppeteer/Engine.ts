import {Engine, EngineParameters} from '../../core/engine';
import {AnimationCapture} from './AnimationCapture';
import {Screenshoter} from './Screenshoter';
import {Page} from './Page';
import {Readable, finished} from 'stream';
import {promisify} from 'util';

export class PuppeteerEngine implements Engine {
    private page: Page | undefined;
    private animationCapture: AnimationCapture | undefined;
    private screenshoter: Screenshoter | undefined;
    private isOpened: boolean = false;

    constructor(private parameters: EngineParameters) {
    }

    get currentFrame(): number {
        this.ensureOpened();
        return this.animationCapture!.currentFrame;
    }

    get totalFrames(): number {
        this.ensureOpened();
        return this.animationCapture!.totalFrames;
    };

    getScreenshotStream(): Readable {
        this.ensureOpened();
        return this.screenshoter!;
    }

    hasNextFrame(): boolean {
        this.ensureOpened();
        return this.animationCapture!.hasNextFrame();
    }

    async nextFrame(): Promise<boolean> {
        this.ensureOpened();
        const hasNext = await this.animationCapture!.nextFrame();
        if (!hasNext) {
            this.screenshoter?.end();
        }
        return hasNext;
    }

    async open(): Promise<void> {
        if (this.isOpened) {
            return;
        }

        this.page = new Page();
        this.animationCapture = new AnimationCapture(this.page, this.parameters.logger, {
            delay: this.parameters.delay,
            duration: this.parameters.duration,
            fps: this.parameters.fps
        });
        this.screenshoter = new Screenshoter(this.parameters.target, this.page, this.parameters.logger);

        await this.page.preparePage();
        await this.animationCapture.getReady();
        await this.page.openUrl(this.parameters.url);

        this.isOpened = true;

        this.parameters.logger.debug(this.constructor.name, 'engine opened');
    }

    async close(): Promise<void> {
        if (!this.isOpened) {
            return;
        }

        await this.page!.destroyPage();
        this.animationCapture = undefined;
        this.screenshoter = undefined;
        this.page = undefined;

        this.isOpened = false;

        this.parameters.logger.debug(this.constructor.name, 'engine closed');
    }

    reset(): Promise<void> {
        this.ensureOpened();
        this.screenshoter = new Screenshoter(this.parameters.target, this.page!, this.parameters.logger);
        return this.animationCapture!.reset();
    }

    screenshot(): Promise<void> {
        this.ensureOpened();
        return this.screenshoter!.screenshot();
    }

    private ensureOpened() {
        if (!this.isOpened) {
            throw new Error('Engine is not opened for screenshot recording');
        }
    }
}
