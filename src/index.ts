import {Logger} from './core/logger';
import {FsOutput} from './outputs/FsOutput';
import {GifEncoderOutput} from './outputs/GifEncoderOutput';

export {Studio} from './Studio';
export {Config} from './core/config';

export const LOG_LEVELS = {
    error: Logger.LEVEL_ERROR,
    log: Logger.LEVEL_LOG,
    debug: Logger.LEVEL_DEBUG,
};

export const outputs = {
    FsOutput: FsOutput,
    GifEncoder: GifEncoderOutput
};
