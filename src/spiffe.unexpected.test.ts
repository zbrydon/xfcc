import { describe, expect, it, vi } from 'vitest';

vi.mock('./index.ts', () => ({
  safeParseXfcc: () => ({
    ok: true,
    value: [
      {
        get uri(): never {
          throw new RangeError('unexpected');
        },
      },
    ],
  }),
}));

const { safeGetPeerSpiffeId } = await import('./spiffe.ts');

describe('safeGetPeerSpiffeId', () => {
  it('rethrows errors that are not SpiffeError', () => {
    expect(() => safeGetPeerSpiffeId('x', { format: 'text' })).toThrow(RangeError);
  });
});
