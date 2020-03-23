import Puppeteer from 'puppeteer';

export class Page {
    private browser: Puppeteer.Browser | undefined;
    private page: Puppeteer.Page | undefined;
    isOpened: boolean = false;

    getPage(): Puppeteer.Page {
        if (!this.isOpened) {
            throw new Error('Page is not prepared yet');
        }

        return this.page as Puppeteer.Page;
    }

    async preparePage(): Promise<void> {
        if (!this.isOpened) {
            if (!this.browser) {
                this.browser = await Puppeteer.launch();
            }

            if (!this.page) {
                this.page = await this.browser.newPage();
            }

            this.isOpened = true;
        }
    }

    async openUrl(url: string): Promise<void> {
        if (this.page) {
            await this.page.goto(url);
        }
    }

    async destroyPage(): Promise<void> {
        if (this.page) {
            await this.browser?.close();
            this.page = undefined;
            this.browser = undefined;
            this.isOpened = false;
        }
    }
}
