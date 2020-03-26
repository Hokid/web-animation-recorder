declare module 'gifencoder' {
    import {Readable, Writable} from 'stream';
    export default class GifEncoder {
        constructor(width: number, height: number);
        addFrame(frame: any): void;
        setRepeat(value: 0 | -1): void;
        setQuality(value: number): void;
        createReadStream(ops?: any): Readable;
        createWriteStream(ops?: any): Writable;
    }
}

declare module 'png-js' {
    export default class PNG {
        constructor(buff: Buffer);
        width: number;
        height: number;
        decodePixels(cb: (p: number[]) => any): void;
    }
}
