const {Studio} = require('./dist/Studio');
const {FsOutput} = require('./dist/outputs/FsOutput');

const studio = new Studio({
    output: {
        type: FsOutput,
        path: './screenshots/' + Date.now()
    },
    delay: 0,
    duration: 1000,
    fps: 30,
    target: {
        type: 'selector',
        selector: '#root',
        omitBackground: false
    },
    url: `file://${__dirname}/animation.html?fps=30`
});

studio.makeAnimation().then(
    () => {
        console.log('done');
        process.exit(0);
    },
    error => {
        console.error(error);
        process.exit(1);
    }
);
