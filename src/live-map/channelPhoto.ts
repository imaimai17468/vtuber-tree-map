const GOOGLE_SIZE = /=s\d+-/u;

/**
 * Google serves a channel icon at whatever size the URL asks for, and Holodex
 * hands back `=s800-` for all of them: 183 KB to fill a 56px square, against
 * 8 KB at the size drawn.
 */
export const photoUrlForSize = (url: string, pixels: number): string =>
  url.replace(GOOGLE_SIZE, `=s${String(pixels)}-`);
