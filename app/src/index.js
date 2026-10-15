import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { loadConfig } from './config.js';
import { parseRequest, RequestError } from './request.js';
import { resizeImage, ALLOWED_MIME_TYPES, PASSTHROUGH_MIME_TYPES } from './image.js';

function textResponse(statusCode, body) {
    return {
        statusCode,
        body,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    };
}

function isNotFound(err) {
    return err?.name === 'NoSuchKey' || err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;
}

/**
 * Builds the handler with injectable dependencies so it can be tested without AWS.
 */
export function createHandler({ s3, config }) {
    function imageResponse(body, contentType) {
        return {
            statusCode: 200,
            body: Buffer.from(body).toString('base64'),
            isBase64Encoded: true,
            headers: { 'Content-Type': contentType, 'Cache-Control': config.cacheControl },
        };
    }

    /**
     * Returns the object, or null if it doesn't exist. Any other S3 error
     * (access denied, throttling, ...) is thrown instead of being reported as a 404.
     */
    async function getObject(key) {
        let data;
        try {
            data = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        } catch (err) {
            if (isNotFound(err)) return null;
            throw err;
        }
        // SDK v3 returns a stream; read it into a Buffer.
        return { body: Buffer.from(await data.Body.transformToByteArray()), contentType: data.ContentType };
    }

    return async function handler(event) {
        const path = event?.pathParameters?.proxy;

        try {
            const request = parseRequest(path, config);

            // if a resized option exists, return it.
            const existing = await getObject(request.cacheKey);
            if (existing) return imageResponse(existing.body, existing.contentType);

            const original = await getObject(request.key);
            if (!original) return textResponse(404, `Image not found: ${request.key}`);

            const mime = original.contentType;
            if (!ALLOWED_MIME_TYPES.includes(mime)) {
                return textResponse(400, `Unsupported MIME type: ${mime}. Supported types: ${ALLOWED_MIME_TYPES.join(', ')}`);
            }

            if (PASSTHROUGH_MIME_TYPES.includes(mime)) {
                return imageResponse(original.body, mime);
            }

            const result = await resizeImage(original.body, request);

            // save newly created image to S3.
            await s3.send(new PutObjectCommand({
                Body: result,
                Bucket: config.bucket,
                ContentType: mime,
                Key: request.cacheKey,
                CacheControl: config.cacheControl,
            }));

            return imageResponse(result, mime);
        } catch (err) {
            if (err instanceof RequestError) return textResponse(err.status, err.message);
            console.error('Resize failed', { path, error: err });
            return textResponse(500, 'Internal error while processing the image.');
        }
    };
}

let defaultHandler;

export const handler = async (event) => {
    defaultHandler ??= createHandler({ s3: new S3Client({}), config: loadConfig() });
    return defaultHandler(event);
};
