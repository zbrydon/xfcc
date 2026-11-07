import { parseDistinguishedName, XfccError } from '../../dist/index.mjs';

import { deepStrictEqual, ok, text } from './common.mjs';

/** Writes every non-alphanumeric byte as `\XX`, which RFC 4514 allows anywhere. */
const format = (rdns) =>
  rdns
    .map((rdn) =>
      rdn
        .map(({ type, value, encoding }) => {
          if (encoding === 'hex') {
            return `${type}=#${value}`;
          }
          const escaped = [...Buffer.from(value, 'utf8')]
            .map((byte) =>
              /[A-Za-z0-9]/.test(String.fromCodePoint(byte))
                ? String.fromCodePoint(byte)
                : `\\${byte.toString(16).toUpperCase().padStart(2, '0')}`,
            )
            .join('');
          return `${type}=${escaped}`;
        })
        .join('+'),
    )
    .join(',');

const parse = (input) => {
  try {
    return parseDistinguishedName(input);
  } catch (error) {
    ok(error instanceof XfccError);
    ok(Number.isSafeInteger(error.offset) && error.offset >= 0);
    return null;
  }
};

export const fuzz = (data) => {
  const input = text(data);
  const rdns = parse(input);
  // An accepted DN must survive being written back out and parsed again.
  if (rdns !== null) {
    deepStrictEqual(parse(format(rdns)), rdns);
  }
  // A raw NUL is never valid.
  if (input.includes('\0')) {
    ok(rdns === null);
  }
};
