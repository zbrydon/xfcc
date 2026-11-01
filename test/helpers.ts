import { readFileSync } from 'node:fs';

import { XfccError } from '../src/index.ts';

export const fixture = (name: string): string =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');

export const CLIENT_PEM = fixture('client.pem');
export const CA_PEM = fixture('ca.pem');
export const CLIENT_SHA256 = fixture('client.sha256').trim();
export const NASTY_SUBJECT = fixture('nasty.subject').trimEnd();

export const HASH_A = '468ed33be74eee6556d90c0149c1309e9ba61d6425303443c0748a02dd8de688';
export const HASH_B = '9ba61d6425303443c0748a02dd8de688468ed33be74eee6556d90c0149c1309e';

/** Mirrors Envoy's `PercentEncoding::urlEncode`. */
export const urlEncode = (value: string): string =>
  [...Buffer.from(value, 'utf8')]
    .map((byte) =>
      /[A-Za-z0-9*._-]/.test(String.fromCodePoint(byte))
        ? String.fromCodePoint(byte)
        : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`,
    )
    .join('');

export const errorOf = (fn: () => unknown): XfccError => {
  try {
    fn();
  } catch (error) {
    if (error instanceof XfccError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected an XfccError');
};
