import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { loadConfig } from './config.js';
import { parseRequest, RequestError } from './request.js';
import { resizeImage, ALLOWED_MIME_TYPES, PASSTHROUGH_MIME_TYPES } from './image.js';

const S3 = new S3Client({});
const config = loadConfig();

function textResponse(statusCode, body, headers = {}) {
    return { statusCode, body, headers: { 'Content-Type': 'text/plain', ...headers } };
}

function imageResponse(body, contentType, headers = {}) {
    return {
        statusCode: 200,
        body: Buffer.from(body).toString('base64'),
        isBase64Encoded: true,
        headers: { 'Content-Type': contentType, 'Cache-Control': config.cacheControl, ...headers },
    };
}

async function getResource(key) {
    try {
        const data = await S3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        // SDK v3 returns a stream; read it into a Buffer.
        return { ...data, Body: Buffer.from(await data.Body.transformToByteArray()) };
    } catch (err) {
        return false;
    }
}

export const handler = async (event) => {
    const pathParameters = event.pathParameters;
    const path = pathParameters.proxy || pathParameters[Object.keys(pathParameters)[0]];

    let request;
    try {
        request = parseRequest(path, config);
    } catch (err) {
        if (err instanceof RequestError) return textResponse(err.status, err.message);
        throw err;
    }

    // if a resized option exists, return it.
    const existingResized = await getResource(request.cacheKey);
    if (existingResized) {
        return imageResponse(existingResized.Body, existingResized.ContentType);
    }

    const originalImage = await getResource(request.key);
    if (!originalImage) {
        return textResponse(404, `Resource not found. Could not find resource: ${request.key}.`, {
            'Cache-Control': 'private, nocache',
        });
    }

    const mime = originalImage.ContentType;
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
        return textResponse(400, `Unsupported MIME type: ${mime}. Supported types: ${ALLOWED_MIME_TYPES.join(', ')}`, {
            'Cache-Control': 'private, nocache',
        });
    }

    if (PASSTHROUGH_MIME_TYPES.includes(mime)) {
        return imageResponse(originalImage.Body, mime, { 'Age': 0 });
    }

    const result = await resizeImage(originalImage.Body, request);

    // save newly created image to S3.
    await S3.send(new PutObjectCommand({
        Body: result,
        Bucket: config.bucket,
        ContentType: mime,
        Key: request.cacheKey,
        CacheControl: config.cacheControl,
    }));

    return imageResponse(result, mime, { 'Age': 0 });
};
