import { describe, expect, it } from 'vitest';

import { errorOf, NASTY_SUBJECT } from '../test/helpers.ts';

import { parseDn } from './dn.ts';

const s = (type: string, value: string) => ({ type, value, encoding: 'string' });

describe('parseDn', () => {
  it('parses an empty DN', () => {
    expect(parseDn('')).toEqual([]);
  });

  it('parses the Envoy documentation example', () => {
    expect(parseDn('CN=Test Client,OU=Lyft,L=San Francisco,ST=CA,C=US')).toEqual([
      [s('CN', 'Test Client')],
      [s('OU', 'Lyft')],
      [s('L', 'San Francisco')],
      [s('ST', 'CA')],
      [s('C', 'US')],
    ]);
  });

  it('parses the RFC 4514 section 4 examples', () => {
    expect(parseDn('UID=jsmith,DC=example,DC=net')).toEqual([
      [s('UID', 'jsmith')],
      [s('DC', 'example')],
      [s('DC', 'net')],
    ]);
    expect(parseDn('OU=Sales+CN=J.  Smith,DC=example,DC=net')).toEqual([
      [s('OU', 'Sales'), s('CN', 'J.  Smith')],
      [s('DC', 'example')],
      [s('DC', 'net')],
    ]);
    expect(parseDn('CN=James \\"Jim\\" Smith\\, III,DC=example,DC=net')[0]).toEqual([
      s('CN', 'James "Jim" Smith, III'),
    ]);
    expect(parseDn('CN=Before\\0dAfter,DC=example,DC=net')[0]).toEqual([s('CN', 'Before\rAfter')]);
    expect(parseDn('1.3.6.1.4.1.1466.0=#04024869')).toEqual([
      [{ type: '1.3.6.1.4.1.1466.0', value: '04024869', encoding: 'hex' }],
    ]);
    expect(parseDn('CN=Lu\\C4\\8Di\\C4\\87')).toEqual([[s('CN', 'Lučić')]]);
  });

  it('does not treat an escaped comma as an RDN boundary', () => {
    expect(parseDn('CN=evil\\,O=Admin,O=Lyft')).toEqual([
      [s('CN', 'evil,O=Admin')],
      [s('O', 'Lyft')],
    ]);
  });

  it('handles leading and trailing spaces and hashes', () => {
    expect(parseDn('CN=\\  #pad\\ ')).toEqual([[s('CN', '  #pad ')]]);
    expect(parseDn('CN=\\#x')).toEqual([[s('CN', '#x')]]);
    expect(parseDn('CN=a#b=c')).toEqual([[s('CN', 'a#b=c')]]);
    expect(parseDn('CN=')).toEqual([[s('CN', '')]]);
  });

  it('lowercases a hexstring', () => {
    expect(parseDn('CN=#0A0b+O=#FF,C=a')).toEqual([
      [
        { type: 'CN', value: '0a0b', encoding: 'hex' },
        { type: 'O', value: 'ff', encoding: 'hex' },
      ],
      [s('C', 'a')],
    ]);
  });

  it('decodes UTF-8, raw or escaped, and keeps a byte order mark', () => {
    expect(parseDn('CN=é')).toEqual([[s('CN', 'é')]]);
    expect(parseDn('CN=😀,O=\\F0\\9F\\98\\80')).toEqual([[s('CN', '😀')], [s('O', '😀')]]);
    // TextDecoder drops a leading U+FEFF unless told not to.
    expect(parseDn('CN=\\EF\\BB\\BFa')).toEqual([[s('CN', '\uFEFFa')]]);
  });

  it('parses the OpenSSL fixture', () => {
    expect(parseDn(NASTY_SUBJECT)).toEqual([
      [s('description', 'café')],
      [s('UID', '  #pad '), s('CN', 'evil,O=Admin')],
      [s('OU', 'a"b\\c')],
      [s('O', 'Lyft')],
      [s('C', 'US')],
    ]);
  });

  it.each([
    ['CN', 2],
    ['=x', 0],
    ['CN=a,', 5],
    [',CN=a', 0],
    ['CN=a+', 5],
    ['CN=a,,O=b', 5],
    ['CN=a;O=b', 4],
    ['CN=a"b', 4],
    ['CN=a<b', 4],
    ['CN=a>b', 4],
    ['CN=a\0b', 4],
    ['CN= a', 3],
    ['CN=a ', 4],
    ['CN=#', 4],
    ['CN=#0', 5],
    ['CN=#0g', 6],
    ['CN=#00x', 6],
    ['CN=a\\', 5],
    ['CN=a\\x', 6],
    ['CN=a\\4', 6],
    ['CN=a\\4x', 7],
    ['CN=a\\00', 3],
    ['CN=\\C3', 3],
    ['CN=\\FF', 3],
    ['CN=\\ED\\A0\\80', 3],
    ['C N=a', 2],
    ['é=a', 0],
    ['1=a', 1],
    ['1.=a', 3],
    ['1.x=a', 3],
    ['01.2=a', 1],
    ['1.02=a', 3],
    ['1.2x=a', 4],
    ['-CN=a', 0],
    ['CN=a=b,=c', 7],
  ])('rejects %j at byte %i', (dn, offset) => {
    const error = errorOf(() => parseDn(dn));
    expect(error.code).toBe('INVALID_DN');
    expect(error.offset).toBe(offset);
  });

  it('reports byte offsets past multi-byte characters', () => {
    expect(errorOf(() => parseDn('CN=é;')).offset).toBe(5);
  });
});
