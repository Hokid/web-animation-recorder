import {Page} from './Page';
import {EngineFrames} from '../../core/engine';
import {Logger} from '../../core/logger';

export class AnimationCapture implements EngineFrames {
    readonly totalFrames: number = 0;
    currentFrame: number = 0;

    private readonly fps: number = 30;
    private readonly delay: number = 0;
    private readonly duration: number = 0;
    private readonly frameDuration: number = 0;
    private readonly fFrameDuration: number = 0;
    private readonly offsetPayload: number = 0;
    private isAnimationPaused: boolean = false;
    private lastStartAnimationCallTime: number = 0;
    private lastStopAnimationCallTime: number = 0;
    private lastStartStopAnimationCallTime: number = 0;
    private lastWait: number = 0;
    private balance: number = 0;
    private needDelay: boolean = true;
    private isReady: boolean = false;

    constructor(
        private page: Page,
        private logger: Logger,
        parameters: {
            duration: number,
            delay?: number,
            fps?: number
        }
    ) {
        this.duration = parameters.duration;

        if (parameters.fps) {
            this.fps = parameters.fps
        }

        if (parameters.delay) {
            this.delay = parameters.delay
        }

        if (this.delay === 0) {
            this.needDelay = false;
        }

        this.frameDuration = Math.floor(1000 / this.fps);
        this.fFrameDuration = (1000 / this.fps) % 1;
        this.totalFrames = Math.floor(this.duration / 1000 * this.fps);
        this.offsetPayload = Math.ceil(this.frameDuration * 0.1);

        logger.debug(this.constructor.name, 'initial parameters', {
            delay: this.delay,
            fps: this.fps,
            duration: this.duration,
            frameDuration: this.frameDuration,
            fFrameDuration: this.fFrameDuration,
            totalFrames: this.totalFrames,
            offsetPayload: this.offsetPayload
        });
    }

    async getReady() {
        if (!this.isReady) {
            await this.stopAnimation();
            this.isReady = true;
            this.logger.debug(this.constructor.name, 'ready for use');
        }
    }

    hasNextFrame(): boolean {
        return this.totalFrames > this.currentFrame;
    }

    async nextFrame(): Promise<boolean> {
        if (!this.isReady) {
            throw new Error('AnimationCapture is not ready');
        }

        let add: number = 0;

        this.logger.debug(this.constructor.name, 'preparing next frame');


        if (this.totalFrames === 0) {
            this.logger.debug(this.constructor.name, 'total frames is zero');
            return false;
        }

        if (!this.hasNextFrame()) {
            this.logger.debug(this.constructor.name, 'no more frames');
            return false;
        }

        ++this.currentFrame;

        this.logger.debug(this.constructor.name, 'got next frame number', this.currentFrame);

        const frameRate = this.frameDuration + this.fFrameDuration;

        this.logger.debug(this.constructor.name, 'got next frame rate', frameRate);

        if (this.needDelay || this.currentFrame === 0) {
            const delay = this.delay > 0
                ? (Math.floor(this.delay / frameRate)) + (Math.ceil(frameRate / 2) * Math.ceil(this.delay % frameRate))
                : Math.ceil(frameRate / 2);

            this.logger.debug(this.constructor.name, 'got next frame delay', delay);

            await this.startAnimation();
            await this.wait(delay);
            await this.stopAnimation();

            this.needDelay = false;
            this.addBalance(this.lastStartStopAnimationCallTime + (this.lastWait - delay));
        }

        // we already on the first frame, no need to do start/stop animation next
        if (this.currentFrame === 1) {
            this.logger.debug(this.constructor.name, 'next frame prepared');
            return true;
        }

        this.addBalance(-this.fFrameDuration);

        if (this.balance <= 0 || this.balance > this.offsetPayload) {
            add = Math.floor(this.balance * -1) + this.offsetPayload;
            this.addBalance(add);

            this.logger.debug(this.constructor.name, 'got next frame addition waiting time', add);
        }

        this.logger.debug(this.constructor.name, 'got next frame animation waiting time', this.frameDuration + add);

        await this.startAnimation();
        await this.wait(this.frameDuration + add);
        await this.stopAnimation();

        this.addBalance(this.lastStartStopAnimationCallTime + this.lastWait - (this.frameDuration + add));

        this.logger.debug(this.constructor.name, 'next frame prepared');

        return true;
    }

    async reset(): Promise<void> {
        this.balance = 0;
        this.currentFrame = 0;
    }

    private wait(ms: number): Promise<void> {
        return new Promise(done => {
            this.logger.debug(this.constructor.name, 'waiting...');
            const start = Date.now();
            setTimeout(() => {
                const end = Date.now();
                this.lastWait = end - start;
                this.logger.debug(this.constructor.name, 'done waiting', this.lastWait);
                done();
            }, ms);
        });
    }

    private async startAnimation() {
        if (this.isAnimationPaused) {
            this.logger.debug(this.constructor.name, 'starting animation...');
            const start = Date.now();
            await (<any>this.page.getPage())._client.send('Animation.setPlaybackRate', {playbackRate: 1});
            const end = Date.now();
            this.lastStartAnimationCallTime = end - start;
            this.isAnimationPaused = false;
            this.logger.debug(this.constructor.name, 'animation started', this.lastStartAnimationCallTime);
        }
    }

    private async stopAnimation() {
        if (!this.isAnimationPaused) {
            this.logger.debug(this.constructor.name, 'stopping animation...');
            const start = Date.now();
            await (<any>this.page.getPage())._client.send('Animation.setPlaybackRate', {playbackRate: 0});
            const end = Date.now();

            if (this.isReady) {
                this.lastStopAnimationCallTime = end - start;
                this.updateLastStartStopAnimationTime();
            }
            this.logger.debug(this.constructor.name, 'animation stop', this.lastStopAnimationCallTime);
            this.isAnimationPaused = true;
        }
    }

    private addBalance(value: number) {
        this.balance += value;
        this.logger.debug(this.constructor.name, 'balance changed', this.balance);
    }

    private updateLastStartStopAnimationTime() {
        this.lastStartStopAnimationCallTime = (this.lastStartAnimationCallTime + this.lastStopAnimationCallTime) * 0.5;
        this.logger.debug(this.constructor.name, 'last start/stop animation call time', this.lastStartStopAnimationCallTime);
    }
}
