import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createHandler } from '../src/index.js';
import { loadConfig } from '../src/config.js';
import { fakeS3, event, png } from './helpers.js';

const config = loadConfig({ BUCKET: 'b', ALLOWED_DIMENSIONS: '*', MAX_SOURCE_BYTES: '5000000' });

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
    assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('S3 errors other than not-found are 500s, not 404s', async () => {
    const res = await createHandler({ s3: fakeS3(), config: { ...config, bucket: 'denied' } })(event('100x100/cat.png'));
    assert.equal(res.statusCode, 500);
});

test('missing path is a 400, not a crash', async () => {
    const res = await createHandler({ s3: fakeS3(), config })({ pathParameters: {} });
    assert.equal(res.statusCode, 400);
});

test('400 for invalid requests, before any S3 call', async () => {
    const s3 = fakeS3();
    const res = await createHandler({ s3, config })(event('abcx1/cat.png'));
    assert.equal(res.statusCode, 400);
    assert.equal(s3.calls.length, 0);
});

test('400 for unsupported MIME types', async () => {
    const s3 = fakeS3({ 'b/doc.pdf': { body: Buffer.from('%PDF'), type: 'application/pdf' } });
    const res = await createHandler({ s3, config })(event('100x100/doc.pdf'));
    assert.equal(res.statusCode, 400);
});

test('413 for oversized originals, without downloading them', async () => {
    const s3 = fakeS3({ 'b/big.png': { body: Buffer.alloc(5000001), type: 'image/png' } });
    const res = await createHandler({ s3, config })(event('100x100/big.png'));
    assert.equal(res.statusCode, 413);
});
