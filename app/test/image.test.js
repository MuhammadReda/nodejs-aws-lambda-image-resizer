import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { resizeImage } from '../src/image.js';
import { png } from './helpers.js';

test('resizes with cover', async () => {
    const meta = await sharp(await resizeImage(await png(800, 600), { width: 320, height: 320, fit: 'cover' })).metadata();
    assert.deepEqual([meta.width, meta.height], [320, 320]);
});

test('auto height keeps aspect ratio', async () => {
    const meta = await sharp(await resizeImage(await png(800, 600), { width: 400, height: null, fit: 'cover' })).metadata();
    assert.deepEqual([meta.width, meta.height], [400, 300]);
});

test('never enlarges', async () => {
    const meta = await sharp(await resizeImage(await png(100, 50), { width: 1000, height: 500, fit: 'cover' })).metadata();
    assert.deepEqual([meta.width, meta.height], [100, 50]);
});
