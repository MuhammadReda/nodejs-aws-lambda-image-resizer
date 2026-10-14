import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRequest, RequestError } from '../src/request.js';
import { loadConfig } from '../src/config.js';

const open = loadConfig({ BUCKET: 'b' });
const whitelisted = loadConfig({ BUCKET: 'b', WHITELISTED_DIMENSIONS: '640x480 autox300' });

test('parses size, default fit and nested key', () => {
    assert.deepEqual(parseRequest('640x480/a/b/cat.jpg', open), {
        width: 640, height: 480, fit: 'cover', key: 'a/b/cat.jpg', cacheKey: '640x480/a/b/cat.jpg',
    });
});

test('parses explicit fit and auto dimensions', () => {
    const r = parseRequest('autox300_inside/cat.png', open);
    assert.equal(r.width, null);
    assert.equal(r.height, 300);
    assert.equal(r.fit, 'inside');
});

test('rejects unknown fit', () => {
    assert.throws(() => parseRequest('640x480_wat/a.jpg', open), (e) => e instanceof RequestError && e.status === 400);
});

test('enforces whitelist when set', () => {
    assert.throws(() => parseRequest('641x480/a.jpg', whitelisted), RequestError);
    assert.equal(parseRequest('640x480_contain/a.jpg', whitelisted).fit, 'contain');
});
