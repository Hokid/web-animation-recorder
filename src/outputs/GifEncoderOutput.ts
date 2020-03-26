import {Writable} from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import {Logger} from '../core/logger';
import GifEncoder from 'gifencoder';
import png from 'png-js';
import {FsOutput} from './FsOutput';

type Params = {
    path: string;
    tmpPath?: string,
    logger: Logger;
    repeat?: 0 | -1;
    quality?: number;
    removeTmp?: boolean;
}

// If we directly provide chunks to encoder write stream then some frames has missed.
// As workaround firstly save frames to fs and then write each frame file to encoder stream.
export class GifEncoderOutput extends Writable {
    private readonly path: string;
    private readonly tmpPath: string;
    private isInitialized: boolean = false;
    private logger: Logger;
    private fs: FsOutput;
    private encoder!: GifEncoder;
    private encoderWs!: Writable;
    private params: Params;

    constructor(params: Params) {
        super({
            highWaterMark: 0,
            objectMode: true
        });

        this.params = Object.assign({
            removeTmp: true
        }, params);

        this.logger = params.logger;
        this.path = path.isAbsolute(params.path)
            ? params.path
            : path.resolve(process.cwd(), params.path);

        this.tmpPath = '';

        if (params.tmpPath) {
            this.tmpPath = path.isAbsolute(params.tmpPath)
                ? params.tmpPath
                : path.resolve(process.cwd(), params.tmpPath);
        } else {
            this.tmpPath = path.resolve(path.dirname(this.path), './.frames-' + path.basename(this.path));
        }

        this.fs = new FsOutput({
            path: this.tmpPath,
            logger: params.logger
        });

        this.logger.debug(this.constructor.name, 'output path: ', this.path);
        this.logger.debug(this.constructor.name, 'tmp path path: ', this.tmpPath);

        this.on('finish', () => {
            this.logger.log(this.constructor.name, 'output file: ' + this.path);
        });
    }

    _write(chunk: any, encoding: string, callback: (error?: (Error | null)) => void): void {
        const write = () => this.fs.write(chunk, encoding, callback);

        if (!this.isInitialized) {
            fs.promises.mkdir(path.dirname(this.path), {recursive: true})
                .then(() => {
                    const size = this.getSize(chunk);
                    this.initialize(size.width, size.height);
                    return write();
                }, callback);
        } else {
            write();
        }
    }

    async _final(callback: (error?: (Error | null)) => void): Promise<void> {
        try {
            this.encoderWs.on('finish', () => {
                this.removeTmpDir().then(() => {
                    callback();
                }, callback);
            });

            const paths = await this.getTmpImagesPaths();

            for (const framePath of paths) {
                const buff = await fs.promises.readFile(framePath);
                await this.writeToEncoder(buff);
            }

            this.encoderWs.end();
        } catch (e) {
            callback(e);
        }
    }

    private initialize(width: number, height: number) {
        this.encoder = new GifEncoder(width, height);
        this.encoder.setRepeat(this.params.repeat === 0 ? 0 : -1);
        this.encoder.setQuality(this.params.quality || 10);
        this.encoder.createReadStream().pipe(fs.createWriteStream(this.path));
        this.encoderWs = this.encoder.createWriteStream();
        this.isInitialized = true;
    }

    private async removeTmpDir(): Promise<void> {
        if (this.params.removeTmp) {
            await fs.promises.rmdir(this.tmpPath, {
                recursive: true
            });
        }
    }

    private async writeToEncoder(imageBuffer: Buffer): Promise<void> {
        const pixels = await this.getPixelsFromBuffer(imageBuffer);

        return new Promise((resolve, reject) => {
            this.encoderWs.write(pixels, error => error ? reject(error) : resolve())
        });
    }

    private async getTmpImagesPaths(): Promise<string[]> {
        const paths = await fs.promises.readdir(this.tmpPath);
        const getFrameNumber = (filePath: string): number => +filePath.replace(/[^0-9]/g, '');

        paths.sort((a, b) => getFrameNumber(a) - getFrameNumber(b));

        return paths.map(_ => path.resolve(this.tmpPath, _));
    }

    private async getPixelsFromBuffer(imageBuffer: Buffer): Promise<number[]> {
        const _png = new png(imageBuffer);
        return new Promise(r => {
            _png.decodePixels(pixels => {
                r(pixels);
            });
        });
    }

    private getSize(imageBuffer: Buffer): { width: number, height: number } {
        const _png = new png(imageBuffer);
        return {
            width: _png.width,
            height: _png.height
        };
    }
}
