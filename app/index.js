'use strict';

const AWS = require('aws-sdk');
const Sharp = require('sharp');

const S3 = new AWS.S3({ signatureVersion: 'v4' });

// environment variables
const BUCKET = process.env.BUCKET;
const WHITELIST = process.env.WHITELIST
    ? Object.freeze(process.env.WHITELIST.split(' '))
    : null;

const DEFAULT_CACHE_HEADER = 'public, max-age=86400';
const fitOptions = [
    'cover',    // Preserving aspect ratio, ensure the image covers both provided dimensions by cropping/clipping to fit. (default)
    'contain',  // Preserving aspect ratio, contain within both provided dimensions using "letterboxing" where necessary.
    'fill',     // Ignore the aspect ratio of the input and stretch to both provided dimensions.
    'inside',   // Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
    'outside',  // Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.
];

function getResource(resourcePath) {

    let params = {
        Bucket: BUCKET,
        Key: resourcePath
    };

    return new Promise((resolve, reject) => {
        S3.getObject(params, (err, data) => {
            if(err) {
                return resolve(false);
            }
            if(data) {
                return resolve(data);
            }
        })
    });
}

exports.handler = async (event) => {
    const path = event.queryStringParameters.path; // should be something like "200x150_fill/folder/image.png"
    let parts = path.split('/');
    const resizeOption = parts.shift();
    const sizeAndAction = resizeOption.split('_');
    const filename = parts.join('/');
    const sizes = sizeAndAction[0].split('x');
    const action = sizeAndAction.length > 1 ? sizeAndAction[1] : 'cover';

    // validate requested filename extension.
    if(!/\.(jpe?g|png|gif|svg|bmp)$/i.test(filename)) {
        return {
            statusCode: 400,
            body: `Requested file must be an image. Invalid filename: ${filename}.`,
            headers: { 'Content-Type': 'text/plain' }
        };
    }

    // Whitelist validation.
    if (WHITELIST && !WHITELIST.includes(resizeOption)) {
        return {
            statusCode: 400,
            body: `WHITELIST is set but does not contain the size parameter "${resizeOption}"`,
            headers: { 'Content-Type': 'text/plain' }
        };
    }

    // Fit validation
    if(action && (fitOptions.indexOf(action) === -1)) {
        return {
            statusCode: 400,
            body: `Unknown Fit action parameter "${action}"\n` +
                `Available Fit actions: ${fitOptions.join(', ')}.`,
            headers: { 'Content-Type': 'text/plain' }
        };
    }

    try {
        const data = await S3.getObject({
                Bucket: BUCKET,
                Key: filename
            })
            .promise();

        const width = sizes[0] === 'auto' ? null : parseInt(sizes[0]);
        const height = sizes[1] === 'auto' ? null : parseInt(sizes[1]);
        const fit = action || 'cover';

        const result = await Sharp(data.Body, { failOnError: false })
            .resize(width, height, { withoutEnlargement: true, fit })
            .rotate()
            .toBuffer();

        await S3.putObject({
            Body: result,
            Bucket: BUCKET,
            ContentType: data.ContentType,
            Key: path,
            CacheControl: 'public, max-age=86400'
        }).promise();


        return {
            statusCode: 200,
            body: result.toString('base64'),
            isBase64Encoded: true,
            headers: {
                'Content-Type': data.contentType,
                'Cache-Control': 'public, max-age=86400'
            }
        };
    }
    catch(e) {
        return {
            statusCode: e.statusCode || 400,
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                errorMessage: e.message,
                errorCode: e.statusCode || 0,
                error: e
            }
        };
    }
}
