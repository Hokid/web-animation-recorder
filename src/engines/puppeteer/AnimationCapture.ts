import {Page} from './Page';
import {EngineFrames} from '../../core/engine';
import {Logger} from '../../core/logger';
import {AnimationCaptureState} from './AnimationCaptureState';

export class AnimationCapture implements EngineFrames {
    private state: AnimationCaptureState;

    get currentFrame(): number {
        return this.state.currentFrame;
    }

    get totalFrames(): number {
        return this.state.totalFrames;
    }

    get isReady(): boolean {
        return this.state.isReady;
    }

    constructor(
        private page: Page,
        private logger: Logger,
        parameters: {
            duration: number,
            delay?: number,
            fps?: number,
            speed?: number
        }
    ) {
        this.state = new AnimationCaptureState(parameters);

        logger.debug(this.constructor.name, 'initial state', this.state.clone());
    }

    async getReady() {
        if (!this.state.isReady) {
            await this.stopAnimation();
            this.state.isReady = true;
            this.logger.debug(this.constructor.name, 'ready for use');
        }
    }

    hasNextFrame(): boolean {
        return this.state.totalFrames > this.state.currentFrame;
    }

    async nextFrame(): Promise<boolean> {
        const state = this.state;

        if (!state.isReady) {
            throw new Error('AnimationCapture is not ready');
        }

        if (state.totalFrames === 0) {
            this.logger.debug(this.constructor.name, 'total frames is zero', this.state.clone());
            return false;
        }

        if (!this.hasNextFrame()) {
            this.logger.debug(this.constructor.name, 'no more frames', this.state.clone());
            return false;
        }

        state.nextFrame();

        this.logger.debug(this.constructor.name, 'preparing frame', this.state.clone());

        if (state.currentFrame > 1) {
            state.increaseCurrentFramesFractionsParts();
        }

        state.updateWait();

        await this.startAnimation();
        await this.wait(state.virtualWait);
        await this.stopAnimation();

        state.updateLag();
        state.updateTimePointer();

        this.logger.debug(this.constructor.name, 'frame prepared', this.state.clone());

        return true;
    }

    async reset(): Promise<void> {
    }

    private async wait(ms: number): Promise<void> {
        const waiter = new Promise(done => setTimeout(done, ms));

        this.logger.debug(this.constructor.name, 'waiting...', this.state.clone());

        this.state.lastWaitCallTime = await this.measurePendingTime(waiter);

        this.logger.debug(this.constructor.name, 'waiting done', this.state.clone());
    }

    private async startAnimation() {
        if (this.state.isAnimationPaused) {
            this.logger.debug(this.constructor.name, 'starting animation...', this.state.clone());

            const pendingTime = await this.measurePendingTime(
                (<any>this.page.getPage())._client
                    .send('Animation.setPlaybackRate', {playbackRate: this.state.speed})
            );

            this.state.lastStartAnimationCallTime = pendingTime;
            this.state.isAnimationPaused = false;
            this.logger.debug(this.constructor.name, 'animation started', this.state.clone());
        }
    }

    private async stopAnimation() {
        if (!this.state.isAnimationPaused) {
            this.logger.debug(this.constructor.name, 'stopping animation...', this.state.clone());

            const pendingTime = await this.measurePendingTime(
                (<any>this.page.getPage())._client
                    .send('Animation.setPlaybackRate', {playbackRate: 0})
            );

            if (this.state.isReady) {
                this.state.lastStopAnimationCallTime = pendingTime;
            }

            this.state.isAnimationPaused = true;
            this.logger.debug(this.constructor.name, 'animation stop', this.state.clone());
        }
    }

    private async measurePendingTime(promise: Promise<any>): Promise<number> {
        const start = Date.now();
        await promise;
        const end = Date.now();
        return end - start;
    }
}
