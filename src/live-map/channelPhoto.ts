/** Google encodes the requested pixel size in the path as `=s<N>-`. */
const GOOGLE_SIZE = /=s\d+-/u;

/**
 * Asks for a channel icon at the size it is actually drawn at.
 *
 * Google serves these at whatever size the URL requests, and Holodex hands back
 * `=s800-` for every one of them — all 106 live entries carried it on
 * 2026-08-18. That is 183 KB to fill a 56px square, against 8 KB at the size
 * rendered, so a grid of sixty independents was pulling roughly 11 MB of icons.
 *
 * A URL that does not follow the convention is returned untouched, so a change
 * of image host degrades to the original behaviour rather than a broken link.
 */
export const photoUrlForSize = (url: string, pixels: number): string =>
  url.replace(GOOGLE_SIZE, `=s${String(pixels)}-`);
