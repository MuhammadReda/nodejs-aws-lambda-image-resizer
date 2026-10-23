import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRequest, RequestError } from '../src/request.js';
import { loadConfig } from '../src/config.js';

const config = loadConfig({ BUCKET: 'b', ALLOWED_DIMENSIONS: '640x480 autox300 200xauto' });
const open = loadConfig({ BUCKET: 'b', ALLOWED_DIMENSIONS: '*', MAX_DIMENSION: '2000' });

const rejects = (path, cfg, status = 400) =>
    assert.throws(() => parseRequest(path, cfg), (e) => e instanceof RequestError && e.status === status);

test('parses size, default fit and nested key', () => {
    assert.deepEqual(parseRequest('640x480/a/b/cat.jpg', config), {
        width: 640, height: 480, fit: 'cover', size: '640x480', key: 'a/b/cat.jpg', cacheKey: '640x480/a/b/cat.jpg',
    });
});

test('parses explicit fit and auto dimensions', () => {
    const r = parseRequest('/autox300_inside/cat.png', config);
    assert.equal(r.width, null);
    assert.equal(r.height, 300);
    assert.equal(r.fit, 'inside');
    assert.equal(r.cacheKey, 'autox300_inside/cat.png');
});

test('rejects malformed input', () => {
    for (const p of [undefined, '', '640x480', '640x480/', 'abcx100/a.jpg', '640/a.jpg', '640x480_wat/a.jpg']) rejects(p, open);
});

test('rejects auto x auto and zero sizes', () => {
    rejects('autoxauto/a.jpg', open);
    rejects('0x100/a.jpg', open);
});

test('enforces max dimension', () => {
    rejects('2001x10/a.jpg', open);
    assert.equal(parseRequest('2000x10/a.jpg', open).width, 2000);
});

test('enforces allow-list on size, independent of fit', () => {
    rejects('641x480/a.jpg', config);
    assert.equal(parseRequest('640x480_contain/a.jpg', config).fit, 'contain');
});

test('rejects path traversal and empty segments', () => {
    for (const p of ['640x480/../secret.jpg', '640x480/a/./b.jpg', '640x480//a.jpg', '640x480/a/']) rejects(p, config);
});

test('config defaults to a safe allow-list', () => {
    const cfg = loadConfig({ BUCKET: 'b' });
    assert.deepEqual([...cfg.allowedDimensions], ['320x240', '640x480', '1280x960']);
    assert.throws(() => loadConfig({}));
});

test('config accepts the old WHITELISTED_DIMENSIONS name', () => {
    const cfg = loadConfig({ BUCKET: 'b', WHITELISTED_DIMENSIONS: '100x100' });
    assert.deepEqual([...cfg.allowedDimensions], ['100x100']);
});
