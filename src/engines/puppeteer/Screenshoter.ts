import {Page} from './Page';
import {TargetSelector} from '../../core/engine';
import {Readable} from 'stream';
import {Logger} from '../../core/logger';

export class Screenshoter extends Readable {
    private screenshotsPushQueue: number = 0;
    private opened: Promise<any> = Promise.resolve();
    private _open: () => any = () => {};

    constructor(private target: TargetSelector, private page: Page, private logger: Logger) {
        super({
            highWaterMark: 0,
            objectMode: true
        });
    }

    async screenshot() {
        await this.opened;

        this.logger.debug(this.constructor.name, 'making screenshot...');

        this.screenshotsPushQueue++;

        try {
            const el = await this.getElement();

            if (!el) {
                throw new Error('Can`t find element by selector "' + this.target.selector + '"')
            }

            const screenshot = await el.screenshot({
                type: 'png',
                omitBackground: this.target.omitBackground
            });

            this.logger.debug(this.constructor.name, 'pushing screenshot');
            this.onScreenshot(screenshot);
            this.logger.debug(this.constructor.name, 'wait until stream opened');
            await this.opened;
            this.logger.debug(this.constructor.name, 'done');
        } catch (e) {
            this.destroy(e);
        }
    }

    _read(): void {
        this.logger.debug(this.constructor.name, 'screenshot consumer call read');

        let closed = false;

        this.openRead();

        const onpush = (data: any) => {
            if (!closed) {
                this.closeRead();
                closed = true;
            }

            const opened = this.push(data);

            this.logger.debug(this.constructor.name, 'screenshot pushed', opened);
        };
        const end = () => {
            this.off('screenshot_pushed', onpush);
            this.off('end_screenshot_pushing', end);
        };

        this.on('screenshot_pushed', onpush);
        this.on('end_screenshot_pushing', end);
    }

    end() {
        this.push(null);
        this.destroy();
    }

    private onScreenshot(data: any) {
        this.screenshotsPushQueue--;

        this.emit('screenshot_pushed', data);

        if (this.screenshotsPushQueue === 0) {
            this.emit('end_screenshot_pushing');
        }
    }

    private openRead() {
        this.logger.debug(this.constructor.name, 'open read stream');
        this._open();
    }

    private closeRead() {
        this.logger.debug(this.constructor.name, 'close read stream');
        this.opened = new Promise((resolve, reject) => {
            this._open = resolve;
        });
    }

    private async getElement() {
        return this.page.getPage().$(this.target.selector);
    }
}
