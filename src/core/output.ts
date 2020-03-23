import {Writable} from 'stream';

export interface Output extends Writable {
}

export interface OutputConstructor {
    new(config: any): Output;
}
