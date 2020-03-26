import {Readable, Writable} from 'stream';
import {Logger} from './logger';

export interface Target {
    type: string;

    [key: string]: any;
}

export interface TargetSelector extends Target {
    type: 'selector';
    selector: string;
    omitBackground?: boolean;
}

export interface EngineParameters {
    url: string;
    fps?: number;
    speed?: number;
    duration: number;
    delay?: number;
    target: TargetSelector;
    logger: Logger;
    additional?: any;
}

export interface EngineFrames {
    currentFrame: number;
    totalFrames: number;

    hasNextFrame(): boolean;

    nextFrame(): Promise<boolean>;

    reset(): Promise<void>;
}

export interface EngineScreenshot {
    screenshot(): Promise<void>;
}

export interface Engine extends EngineFrames, EngineScreenshot {
    open(): Promise<void>;

    close(): Promise<void>;

    getScreenshotStream(): Readable;
}

export interface EngineConstructor {
    new(parameters: EngineParameters): Engine;
}
