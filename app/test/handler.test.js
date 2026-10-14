import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createHandler } from '../src/index.js';
import { loadConfig } from '../src/config.js';
import { fakeS3, event, png } from './helpers.js';

const config = loadConfig({ BUCKET: 'b' });

test('generates, caches and returns a resized image', async () => {
    const s3 = fakeS3({ 'b/a/cat.png': { body: await png(800, 600), type: 'image/png' } });
    const res = await createHandler({ s3, config })(event('100x100/a/cat.png'));
    assert.equal(res.statusCode, 200);
    assert.equal(res.isBase64Encoded, true);
    const meta = await sharp(Buffer.from(res.body, 'base64')).metadata();
    assert.deepEqual([meta.width, meta.height], [100, 100]);
    assert.ok(s3.store.has('b/100x100/a/cat.png'));
});

test('serves an existing resized image without reading the original', async () => {
    const s3 = fakeS3({ 'b/100x100/cat.png': { body: await png(100, 100), type: 'image/png' } });
    const res = await createHandler({ s3, config })(event('100x100/cat.png'));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(s3.calls, ['GetObjectCommand:b/100x100/cat.png']);
});

test('404 when the original is missing', async () => {
    const res = await createHandler({ s3: fakeS3(), config })(event('100x100/nope.png'));
    assert.equal(res.statusCode, 404);
});

test('400 for invalid requests, before any S3 call', async () => {
    const s3 = fakeS3();
    const res = await createHandler({ s3, config })(event('100x100_wat/cat.png'));
    assert.equal(res.statusCode, 400);
    assert.equal(s3.calls.length, 0);
});

test('400 for unsupported MIME types', async () => {
    const s3 = fakeS3({ 'b/doc.pdf': { body: Buffer.from('%PDF'), type: 'application/pdf' } });
    const res = await createHandler({ s3, config })(event('100x100/doc.pdf'));
    assert.equal(res.statusCode, 400);
});
