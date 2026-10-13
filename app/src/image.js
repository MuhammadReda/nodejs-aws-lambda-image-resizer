import Sharp from 'sharp';

export const ALLOWED_MIME_TYPES = Object.freeze([
    'image/jpeg',
    'image/gif',
    'image/png',
    'image/svg+xml',
    'image/tiff',
    'image/bmp',
]);

// Types Sharp cannot process; these are returned as-is.
export const PASSTHROUGH_MIME_TYPES = Object.freeze([
    'image/bmp',
]);

export function resizeImage(input, { width, height, fit }) {
    return Sharp(input, { failOn: 'none' })
        .resize(width, height, { withoutEnlargement: true, fit })
        .rotate()
        .toBuffer();
}
