import {Writable} from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import {Logger} from '../core/logger';
import {FsOutput} from './FsOutput';
import {exec, execFile} from 'child_process';

type Params = {
    path: string;
    tmpPath?: string,
    logger: Logger;
    fps?: number;
    quality?: number;
    once?: boolean;
    fast?: boolean;
    removeTmp?: boolean;
}

export class GifskiOutput extends Writable {
    private readonly path: string;
    private readonly tmpPath: string;
    private isInitialized: boolean = false;
    private logger: Logger;
    private fs: FsOutput;
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
                    this.isInitialized = true;
                    return write();
                }, callback);
        } else {
            write();
        }
    }

    _final(callback: (error?: (Error | null)) => void): void {
        this.execGifski()
            .then(() => this.removeTmpDir())
            .then(() => callback())
            .catch(callback);
    }

    private async execGifski() {
        const args = [
            '-o=' + this.path,
            !!this.params.fps && '--fps=' + this.params.fps,
            !!this.params.once && '--once',
            !!this.params.quality && '--quality=' + this.params.quality,
            !!this.params.fast && '--fast',
            '*.png'
        ].filter(Boolean) as string[];

        return new Promise((resolve, reject) => {
            exec('gifski ' + args.join(' '), {
                cwd: this.tmpPath
            }, error => error ? reject(error) : resolve());
        })
    }

    private async removeTmpDir(): Promise<void> {
        if (this.params.removeTmp) {
            await fs.promises.rmdir(this.tmpPath, {
                recursive: true
            });
        }
    }
}
