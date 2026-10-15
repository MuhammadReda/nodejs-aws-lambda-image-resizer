import sharp from 'sharp';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/** In-memory stand-in for S3Client. Objects are keyed "bucket/key"; bucket "denied" always fails. */
export function fakeS3(seed = {}) {
    const store = new Map(Object.entries(seed));
    const calls = [];
    return {
        store,
        calls,
        async send(cmd) {
            const { Bucket, Key } = cmd.input;
            calls.push(`${cmd.constructor.name}:${Bucket}/${Key}`);
            if (cmd instanceof GetObjectCommand) {
                if (Bucket === 'denied') throw Object.assign(new Error('Access Denied'), { name: 'AccessDenied' });
                const obj = store.get(`${Bucket}/${Key}`);
                if (!obj) throw Object.assign(new Error('The specified key does not exist.'), { name: 'NoSuchKey' });
                return {
                    ContentType: obj.type,
                    ContentLength: obj.body.length,
                    Body: { transformToByteArray: async () => obj.body, destroy() {} },
                };
            }
            if (cmd instanceof PutObjectCommand) {
                store.set(`${Bucket}/${Key}`, { body: cmd.input.Body, type: cmd.input.ContentType });
                return {};
            }
            throw new Error(`Unexpected command ${cmd.constructor.name}`);
        },
    };
}

export const event = (proxy) => ({ pathParameters: { proxy } });

export const png = (width, height) =>
    sharp({ create: { width, height, channels: 3, background: '#f80' } }).png().toBuffer();
