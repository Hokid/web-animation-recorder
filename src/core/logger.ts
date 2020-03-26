export class Logger {
    static LEVEL_ERROR = 0b001;
    static LEVEL_LOG = 0b010;
    static LEVEL_DEBUG = 0b100;

    private logs: any[] = [];
    private params: {
        level: number,
        collect: boolean,
    };

    constructor(params?: {
        level?: number,
        collect?: boolean,
    }) {
        this.params = Object.assign({
            level: Logger.LEVEL_ERROR,
            collect: false
        }, params);
    }

    flushLogs() {
        const logs = this.logs;
        this.logs = [];
        return logs.sort((a, b) => +a.date - +b.date);
    }

    log(tag: string, message: string, data?: any) {
        if (!this.isLevel(Logger.LEVEL_LOG)) return;

        const log = {
            type: 'log',
            tag,
            message,
            data,
            date: new Date()
        };

        if (this.params.collect) {
            this.logs.push(log);
            return;
        }

        this.print('log', log.date, log.tag, log.message, log.data);
    }

    error(tag: string, message: string | Error, data?: any) {
        if (!this.isLevel(Logger.LEVEL_ERROR)) return;

        const log = {
            type: 'error',
            tag,
            message: message instanceof Error
                ? message.stack ? message.stack.toString() : message.toString()
                : message,
            data,
            date: new Date()
        };

        if (this.params.collect) {
            this.logs.push(log);
            return;
        }

        this.print('error', log.date, log.tag, log.message, log.data);
    }

    debug(tag: string, message: string, data?: any) {
        if (!this.isLevel(Logger.LEVEL_DEBUG)) return;

        const log = {
            type: 'debug',
            tag,
            message,
            data,
            date: new Date()
        };

        if (this.params.collect) {
            this.logs.push(log);
            return;
        }

        this.print('debug', log.date, log.tag, log.message, log.data);
    }

    isLevel(value: number): boolean {
        return !!(this.params.level & value);
    }

    private print(level: 'log' | 'error' |'debug', date: Date, tag: string, message: string, data?: any) {
        const args: any = [
            date.toISOString() + ': ',
            '[' + level.toUpperCase() + ']',
            '[' + tag + ']',
            message,
            data
        ].filter(_ => _ !== undefined);

        console[level].apply(global, args as any);
    }
}
