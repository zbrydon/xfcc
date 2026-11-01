import { describe, expect, it, vi } from 'vitest';

vi.mock('./text.ts', () => ({
  parseText: () => {
    throw new RangeError('unexpected');
  },
}));

vi.mock('./dn.ts', () => ({
  parseDn: () => {
    throw new RangeError('unexpected');
  },
}));

const { safeParseXfcc } = await import('./index.ts');

describe('safeParseXfcc', () => {
  it('rethrows errors that are not XfccError', () => {
    expect(() => safeParseXfcc('Hash=a', { format: 'text' })).toThrow(RangeError);
  });

  it('does not report a defect in the DN parser as INVALID_DN', () => {
    expect(() => safeParseXfcc('[{"subject":"CN=a"}]', { format: 'json' })).toThrow(RangeError);
  });
});
