export function loadConfig(env = process.env) {
    return Object.freeze({
        bucket: env.BUCKET,
        whitelistedDimensions: env.WHITELISTED_DIMENSIONS
            ? Object.freeze(env.WHITELISTED_DIMENSIONS.split(' '))
            : null,
        cacheControl: 'public, max-age=86400',
    });
}
