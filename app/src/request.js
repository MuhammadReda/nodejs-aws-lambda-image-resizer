export const FITS = Object.freeze(['cover', 'contain', 'fill', 'inside', 'outside']);

const SPEC_RE = /^(\d{1,5}|auto)x(\d{1,5}|auto)(?:_([a-z]+))?$/;
const USAGE = 'Expected /{width}x{height}[_{fit}]/{key}, e.g. /640x480/photos/cat.jpg';

export class RequestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * Parses "640x480_inside/path/to/image.jpg" into a validated resize request.
 * Throws RequestError for anything invalid or not allowed.
 */
export function parseRequest(path, config) {
    if (typeof path !== 'string' || path.trim() === '') {
        throw new RequestError(400, `Missing path. ${USAGE}`);
    }

    const clean = path.replace(/^\/+/, '');
    const slash = clean.indexOf('/');
    if (slash <= 0) throw new RequestError(400, `Invalid path. ${USAGE}`);

    const spec = clean.slice(0, slash);
    const key = clean.slice(slash + 1);

    const match = SPEC_RE.exec(spec);
    if (!match) throw new RequestError(400, `Invalid size "${spec}". ${USAGE}`);

    const [, w, h, fitRaw] = match;
    const fit = fitRaw ?? 'cover';
    if (!FITS.includes(fit)) {
        throw new RequestError(400, `Unknown fit "${fit}". Available: ${FITS.join(', ')}.`);
    }
    if (w === 'auto' && h === 'auto') {
        throw new RequestError(400, 'Width and height cannot both be "auto".');
    }

    const width = w === 'auto' ? null : Number(w);
    const height = h === 'auto' ? null : Number(h);
    if (width === 0 || height === 0) throw new RequestError(400, 'Dimensions must be greater than 0.');
    if ((width ?? 0) > config.maxDimension || (height ?? 0) > config.maxDimension) {
        throw new RequestError(400, `Dimensions cannot exceed ${config.maxDimension}px.`);
    }

    const size = `${w}x${h}`;
    if (config.allowedDimensions && !config.allowedDimensions.has(size)) {
        throw new RequestError(400, `Size "${size}" is not allowed. Allowed: ${[...config.allowedDimensions].join(', ')}.`);
    }

    const segments = key.split('/');
    if (key.length === 0 || key.length > 1024 || segments.some((s) => s === '' || s === '.' || s === '..')) {
        throw new RequestError(400, `Invalid image key "${key}".`);
    }

    // cacheKey mirrors the request path so CloudFront can look it up in the cache bucket directly.
    return { width, height, fit, size, key, cacheKey: `${spec}/${key}` };
}
