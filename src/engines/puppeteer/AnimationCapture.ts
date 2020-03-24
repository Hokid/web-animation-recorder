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
            fps?: number
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

        ++state.currentFrame;

        this.logger.debug(this.constructor.name, 'preparing next frame', this.state.clone());

        if (state.currentFrame === 1) {
            state.updateWait();

            await this.startAnimation();
            await this.wait(state.wait);
            await this.stopAnimation();

            state.updateLag();

            this.logger.debug(this.constructor.name, 'delay applied', this.state.clone());
            this.logger.debug(this.constructor.name, 'next frame prepared', this.state.clone());

            // we already on the first frame, no need to do start/stop animation again
            return true;
        }

        state.increaseCurrentFramesFractionsParts();
        state.updateWait();

        await this.startAnimation();
        await this.wait(state.wait);
        await this.stopAnimation();

        state.updateLag();

        this.logger.debug(this.constructor.name, 'next frame prepared', this.state.clone());

        return true;
    }

    async reset(): Promise<void> {
    }

    private wait(ms: number): Promise<void> {
        return new Promise(done => {
            this.logger.debug(this.constructor.name, 'waiting...', this.state.clone());
            const start = Date.now();
            setTimeout(() => {
                const end = Date.now();
                this.state.lastWaitCallTime = end - start;
                this.logger.debug(this.constructor.name, 'waiting done', this.state.clone());
                done();
            }, ms);
        });
    }

    private async startAnimation() {
        if (this.state.isAnimationPaused) {
            this.logger.debug(this.constructor.name, 'starting animation...', this.state.clone());
            const start = Date.now();
            await (<any>this.page.getPage())._client.send('Animation.setPlaybackRate', {playbackRate: 1});
            const end = Date.now();
            this.state.lastStartAnimationCallTime = end - start;
            this.state.isAnimationPaused = false;
            this.logger.debug(this.constructor.name, 'animation started', this.state.clone());
        }
    }

    private async stopAnimation() {
        if (!this.state.isAnimationPaused) {
            this.logger.debug(this.constructor.name, 'stopping animation...', this.state.clone());
            const start = Date.now();
            await (<any>this.page.getPage())._client.send('Animation.setPlaybackRate', {playbackRate: 0});
            const end = Date.now();

            if (this.state.isReady) {
                this.state.lastStopAnimationCallTime = end - start;
            }

            this.state.isAnimationPaused = true;
            this.logger.debug(this.constructor.name, 'animation stop', this.state.clone());
        }
    }
}
