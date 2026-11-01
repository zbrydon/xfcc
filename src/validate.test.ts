import { describe, expect, it } from 'vitest';

import { hexVal, validDns, validHash, validUri } from './validate.ts';

describe('validHash', () => {
  it('accepts a lowercase SHA-256 digest', () => {
    expect(validHash('468ed33be74eee6556d90c0149c1309e9ba61d6425303443c0748a02dd8de688')).toBe(
      true,
    );
  });

  it.each([
    '',
    '468ed33be74eee6556d90c0149c1309e',
    '468ED33BE74EEE6556D90C0149C1309E9BA61D6425303443C0748A02DD8DE688',
    '468ed33be74eee6556d90c0149c1309e9ba61d6425303443c0748a02dd8de68g',
    '468ed33be74eee6556d90c0149c1309e9ba61d6425303443c0748a02dd8de6880',
  ])('rejects %j', (value) => {
    expect(validHash(value)).toBe(false);
  });
});

describe('validUri', () => {
  it.each([
    'http://frontend.lyft.com',
    'spiffe://cluster.local/ns/default/sa/foo',
    'urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66',
    'http://x/?a=b&c=d',
    'A+b.c-d:e',
    'a:b:c',
    'a:?q',
    'a:/',
    'a://',
    'a://:80',
    'a://%41',
    'a://h/p?q#f',
    'a://h?q',
    'a://h#f',
    'a://u:p@h:1/x',
    'a://u@',
    'a://u@[::1]:9/',
    'a://[::1]:80/',
    'a://[v1.x]',
    'a://[V1.x:]',
    'a://[1:2:3:4:5:6:7::]',
    'a://[::ffff:1.2.3.4]',
    'a://[ABCD::1]',
  ])('accepts %j', (value) => {
    expect(validUri(value)).toBe(true);
  });

  it.each([
    '',
    '/relative',
    'no-scheme',
    ':a',
    '1a:b',
    'a_b:c',
    'http://x/%zz',
    'http://x/ y',
    'http://é',
    'http://x/"',
    'http://x/\\',
    'urn:',
    'a:#f',
    'a:b%2',
    'a:b%',
    'a:b?c%',
    'a:b#c%',
    'a:b#f#g',
    'a:[',
    'a://%4',
    'a://a:1:2',
    'a://a:b',
    'a://u@h:x',
    'a://u@%4/',
    'a://u@[bad]/',
    'a://u@h/[',
    'a://x[::1]',
    'a://[::1]x',
    'a://[::1',
    'a://[]',
    'a://[v.x]',
    'a://[v1x]',
    'a://[v1.]',
    'a://[v1.%41]',
    'a://[1.2.3.4]',
    'a://[::g]',
    'a://[1:2:3:4:5:6:7:8::]',
    'a://[fe80::1%25en0]',
    'a://[::ffff:01.2.3.4]',
    `a://[${'1:'.repeat(30)}:]`,
    'a:\u00e9',
  ])('rejects %j', (value) => {
    expect(validUri(value)).toBe(false);
  });
});

describe('validDns', () => {
  it.each([
    'lyft.com',
    'www.lyft.com',
    'localhost',
    '1password.com',
    'xn--bcher-kva.example',
    '*.lyft.com',
    'a-b.c',
    `${'a'.repeat(63)}.com`,
  ])('accepts %j', (value) => {
    expect(validDns(value)).toBe(true);
  });

  it.each([
    '',
    '.',
    'lyft.com.',
    '.lyft.com',
    'lyft..com',
    '-lyft.com',
    'lyft-.com',
    'ly_ft.com',
    '*',
    '*.',
    'w*.lyft.com',
    'www.*.lyft.com',
    '*.*.lyft.com',
    'lyft com',
    'lyft.com,evil',
    'a'.repeat(64),
    Array.from({ length: 128 }, () => 'a').join('.'),
  ])('rejects %j', (value) => {
    expect(validDns(value)).toBe(false);
  });
});

describe('hexVal', () => {
  it('reads both cases and rejects anything else', () => {
    expect(['0', '9', 'a', 'f', 'A', 'F'].map((c) => hexVal(c.charCodeAt(0)))).toEqual([
      0, 9, 10, 15, 10, 15,
    ]);
    expect(['/', ':', '`', 'g', '@', 'G'].map((c) => hexVal(c.charCodeAt(0)))).toEqual(
      Array.from({ length: 6 }, () => -1),
    );
    expect(hexVal(Number.NaN)).toBe(-1);
  });
});
