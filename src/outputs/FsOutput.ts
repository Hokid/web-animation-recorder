import {Writable} from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import {Logger} from '../core/logger';

export class FsOutput extends Writable {
    private path: string;
    private frame: number = 1;
    private dirInitialized: boolean = false;
    private logger: Logger;

    constructor({ path: dir, logger }: { path: string, logger: Logger }) {
        super({
            highWaterMark: 0,
            objectMode: true
        });
        this.logger = logger;
        this.path = path.isAbsolute(dir)
            ? dir
            : path.resolve(process.cwd(), dir);

        this.logger.debug(this.constructor.name, 'directory path: ', this.path);

        this.on('finish', () => {
            this.logger.debug(this.constructor.name, 'all frames saved');
        });
    }

    _write(chunk: any, encoding: string, callback: (error?: (Error | null)) => void): void {
        const frame = this.frame;
        const framePath = this.getFilePath();

        this.logger.debug(this.constructor.name, 'new save request', {
            path: framePath,
            frame
        });
        const origin = callback;

        callback = (err) => {
            if (err) {
                this.logger.error(this.constructor.name, 'save request failed', {
                    path: framePath,
                    frame,
                    error: err
                });
            } else {
                this.logger.debug(this.constructor.name, 'save request processed', {
                    path: framePath,
                    frame
                });
            }

            origin(err);
        };

        const writeFile = () => fs.promises
            .writeFile(framePath, chunk)
            .then(() => {
                this.frame++;
                callback()
            }, callback);

        if (!this.dirInitialized) {
            fs.promises.mkdir(this.path, {
                recursive: true
            }).then(() => {
                this.dirInitialized = true;
                return writeFile();
            }, callback);
        } else {
            writeFile();
        }
    }

    private getFilePath(): string {
        return path.resolve(this.path, `${this.frame}.png`);
    }
}
