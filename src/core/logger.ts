export class Logger {
    private logs: any[] = [];

    constructor(private collect?: boolean) {
    }

    flushLogs() {
        const logs = this.logs;
        this.logs = [];
        return logs.sort((a, b) => +a.date - +b.date);
    }

    error(tag: string, message: string | Error, data?: any) {
        const log = {
            type: 'error',
            tag,
            message: message instanceof Error
                ? message.toString()
                : message,
            data,
            date: new Date()
        };

        if (this.collect) {
            this.logs.push(log);
            return;
        }

        console.error(log.date + ': ', log.tag, log.message, log.data);
    }

    debug(tag: string, message: string, data?: any) {
        const log = {
            type: 'debug',
            tag,
            message,
            data,
            date: new Date()
        };

        if (this.collect) {
            this.logs.push(log);
            return;
        }

        console.error(log.date + ': ', log.tag, log.message, log.data);
    }
}
