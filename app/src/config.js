export const DEFAULT_ALLOWED_DIMENSIONS = '320x240 640x480 1280x960';

function positiveInt(value, fallback) {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Reads configuration from environment variables.
 *
 * ALLOWED_DIMENSIONS: space-separated sizes such as "320x240 640x480 autox600".
 *   Unset or empty uses DEFAULT_ALLOWED_DIMENSIONS. "*" allows any size up to MAX_DIMENSION.
 *   WHITELISTED_DIMENSIONS is accepted as an alias for backwards compatibility.
 */
export function loadConfig(env = process.env) {
    if (!env.BUCKET) throw new Error('BUCKET environment variable is required');

    const rawAllowed = (env.ALLOWED_DIMENSIONS ?? env.WHITELISTED_DIMENSIONS ?? '').trim() || DEFAULT_ALLOWED_DIMENSIONS;

    return Object.freeze({
        bucket: env.BUCKET,
        allowedDimensions: rawAllowed === '*' ? null : new Set(rawAllowed.split(/\s+/)),
        maxDimension: positiveInt(env.MAX_DIMENSION, 4000),
        maxSourceBytes: positiveInt(env.MAX_SOURCE_BYTES, 25 * 1024 * 1024),
        cacheControl: env.CACHE_CONTROL || 'public, max-age=86400',
    });
}
