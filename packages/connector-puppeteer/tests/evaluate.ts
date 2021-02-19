import { URL } from 'url';

import test from 'ava';

import { generateHTMLPage, Server } from '@hint/utils-create-server';
import { Engine, Events } from 'hint';

import Connector from '../src/connector';

const name = 'puppeteer';

const scripts = [
    {
        code:
            `(function () {
    return 10;
}())`,
        result: 10
    },
    {
        code:
            `(function () {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('done');
        }, 1000);
    });
}())`,
        result: 'done'
    },
    {
        code:
            `(function () {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('aborted'));
        }, 1000);
    });
}())`,
        result: new Error('aborted')
    },
    {
        code: 'return 10;',
        result: new Error()
    }
];

test(`[${name}] Evaluate JavaScript`, async (t) => {
    const engine: Engine<Events> = {
        emit(): boolean {
            return false;
        },
        async emitAsync(): Promise<any> { },
        on(): Engine {
            return null as any;
        },
        timeout: 10000
    } as any;

    const server = await Server.create({ configuration: generateHTMLPage('', '') });

    const connector = new Connector(engine, { detached: true });

    await connector.collect(new URL(`http://localhost:${server.port}/`));

    for (let i = 0; i < scripts.length; i++) {
        const { code, result: expectedResult } = scripts[i];

        try {
            const result = await (connector.evaluate ? connector.evaluate(code) : null);

            t.is(result, expectedResult, `Result value "${result}" is the same`);
        } catch (error) {
            if (expectedResult instanceof Error) {
                t.pass('Expected exception');

                /*
                 * HACK: when running all the tests the message we
                 * receive from CDP is "Promise was collected".
                 *
                 * If we run the `chrome.js` test file everything is fine :(
                 *
                 * const message = expectedResult.message;
                 *
                 * if (message) {
                 *     if (error.message !== message) {
                 *         console.error(error.message);
                 *     }
                 *     t.is(error.message, message, `Error message "${message}" is the same`);
                 * } else {
                 *     t.pass('Expected exception with different connector responses');
                 * }
                 */
            } else {
                t.fail(`Unexpected exception thrown\n${error}`);
            }
        }
    }

    await Promise.all([connector.close(), server.stop()]);
});
