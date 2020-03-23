import {OutputConstructor} from './output';
import {TargetSelector} from './engine';

export interface Config {
    output: {
        type: OutputConstructor,
        [key: string]: any;
    };
    fps?: number;
    url: string;
    duration: number;
    delay?: number;
    target: TargetSelector;
}
