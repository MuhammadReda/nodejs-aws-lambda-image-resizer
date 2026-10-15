export const FIT_OPTIONS = Object.freeze([
    'cover',    // Preserving aspect ratio, ensure the image covers both provided dimensions by cropping/clipping to fit. (default)
    'contain',  // Preserving aspect ratio, contain within both provided dimensions using "letterboxing" where necessary.
    'fill',     // Ignore the aspect ratio of the input and stretch to both provided dimensions.
    'inside',   // Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
    'outside',  // Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.
]);

export class RequestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * Parses "640x480_inside/path/to/image.jpg" into a resize request.
 */
export function parseRequest(path, config) {
    if (typeof path !== 'string' || path === '') {
        throw new RequestError(400, 'Missing path. Expected /{width}x{height}/{key}');
    }

    const parts = path.split('/');
    const resizeOption = parts.shift();
    const [size, fit = 'cover'] = resizeOption.split('_');
    const key = parts.join('/');
    const [w, h] = size.split('x');

    // validate requested image dimension against whitelisted dimensions.
    if (config.whitelistedDimensions && !config.whitelistedDimensions.includes(size)) {
        throw new RequestError(400, `WHITELIST is set but does not contain the size parameter "${size}"`);
    }

    if (!FIT_OPTIONS.includes(fit)) {
        throw new RequestError(400, `Unknown Fit action parameter "${fit}"\nAvailable Fit actions: ${FIT_OPTIONS.join(', ')}.`);
    }

    return {
        width: w === 'auto' ? null : parseInt(w),
        height: h === 'auto' ? null : parseInt(h),
        fit,
        key,
        cacheKey: path,
    };
}
