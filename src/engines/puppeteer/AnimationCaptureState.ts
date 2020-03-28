export class AnimationCaptureState {
    readonly totalFrames: number = 0;
    currentFrame: number = 0;

    isAnimationPaused: boolean = false;
    isReady: boolean = false;

    readonly fps: number = 30;
    readonly delay: number = 0;
    readonly speed: number = 1;
    readonly duration: number = 0;
    readonly frameDuration: number = 0;
    readonly frameDurationWholePart: number = 0;
    readonly frameDurationFractionPart: number = 0;

    lastLag: number = 0;
    lastFrameSwitchLag: number = 0;
    lastWaitLag: number = 0;
    lastStartAnimationCallTime: number = 0;
    lastStopAnimationCallTime: number = 0;
    lastWaitCallTime: number = 0;
    wait: number = 0;
    virtualWait: number = 0;
    timePointer: number = 0;
    currentFramesFractionsParts: number = 0;

    constructor(
        parameters: {
            duration: number,
            delay?: number,
            fps?: number,
            speed?: number
        }
    ) {
        this.duration = parameters.duration;

        if (parameters.fps) {
            this.fps = parameters.fps
        }

        if (parameters.delay) {
            this.delay = parameters.delay
        }

        this.speed = parameters.speed ? parameters.speed : 30 / this.fps;
        this.frameDuration = 1000 / this.fps;
        this.frameDurationWholePart = Math.floor(this.frameDuration);
        this.frameDurationFractionPart = this.frameDuration % 1;
        this.totalFrames = Math.floor(this.duration / 1000 * this.fps);
    }

    nextFrame() {
        this.currentFrame++;
    }

    updateTimePointer() {
        this.timePointer += this.wait + this.lastLag;
    }

    updateWait() {
        if (this.currentFrame === 1) {
            this.wait = this.getDelay();
        } else {
            const fractionPartGarbage = this.collectCurrentFramesFractionsPartsGarbage();

            this.wait = this.frameDurationWholePart + fractionPartGarbage;
        }

        this.virtualWait = this.wait / this.speed - this.lastLag;
        this.wait -= this.lastLag;
    }

    private getDelay(): number {
        if (this.currentFrame === 1) {
            const half = Math.ceil(this.frameDuration / 2);

            if (this.delay === 0) {
                return half;
            }

            const delayWhole = Math.floor(this.delay / this.frameDuration);
            const takeHalf = Math.ceil(this.delay % this.frameDuration);

            return delayWhole + half * takeHalf;
        }

        return 0;
    }

    private collectCurrentFramesFractionsPartsGarbage(): number {
        if (this.currentFramesFractionsParts >= 1) {
            this.currentFramesFractionsParts--;
            return 1;
        }
        return 0;
    }

    increaseCurrentFramesFractionsParts() {
        this.currentFramesFractionsParts += this.frameDurationFractionPart;
    }

    updateLag() {
        this.updateFrameSwitchLag();
        this.updateWaitLag();
        this.lastLag = this.lastWaitLag + this.lastFrameSwitchLag;
    }

    updateFrameSwitchLag() {
        this.lastFrameSwitchLag = this.lastStartAnimationCallTime + this.lastStopAnimationCallTime;
    }

    updateWaitLag() {
        this.lastWaitLag = this.lastWaitCallTime - this.virtualWait;
    }

    clone(): AnimationCaptureState {
        const inst = new AnimationCaptureState({
            fps: this.fps,
            delay: this.delay,
            duration: this.duration
        });

        Object.assign(inst, this);

        return inst;
    }
}
