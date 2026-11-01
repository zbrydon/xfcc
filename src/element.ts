import { parseDn } from './dn.ts';
import { reject, XfccError } from './errors.ts';
import { parseCertificate, parseCertificates, percentDecode, sha256Hex } from './pem.ts';
import { validDns, validHash, validUri } from './validate.ts';

import type { XfccElement } from './index.ts';

/** The keys Envoy defines. The numeric order is the order Envoy writes them. */
export const KEY = {
  BY: 0,
  HASH: 1,
  CERT: 2,
  CHAIN: 3,
  SUBJECT: 4,
  URI: 5,
  DNS: 6,
  ISSUER: 7,
} as const;

export type Key = (typeof KEY)[keyof typeof KEY];

/** The options the format parsers read. */
export interface ElementOptions {
  readonly maxElements: number;
  readonly requireCertHash: boolean;
  readonly allowTextIssuer: boolean;
}

/**
 * Rejects a `Subject` / `Issuer` that is not RFC 4514, or that holds a raw
 * control or non-ASCII character. Envoy escapes control characters (a tab is
 * written `\09`) and every non-ASCII byte (`\C3\A9`), so a raw one means the
 * value did not come from Envoy, and it must not reach consumers that may log
 * it. A blocklist of invisible characters would always be incomplete.
 */
const checkDn = (value: string, offset: number | undefined): void => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code >= 0x7f) {
      throw reject('INVALID_CHAR', offset);
    }
  }
  try {
    parseDn(value);
  } catch (error) {
    if (error instanceof XfccError) {
      // The offset of the value in the header, not of the problem in the value.
      throw reject('INVALID_DN', offset);
    }
    throw error;
  }
};

export class ElementBuilder {
  hash: string | null = null;
  readonly #by: string[] = [];
  #cert: string | null = null;
  #certDer: Buffer | null = null;
  readonly #presentedChain: string[] = [];
  #subject: string | null = null;
  readonly uri: string[] = [];
  readonly #dns: string[] = [];
  #issuer: string | null = null;

  /**
   * Validates and stores one value. `percentEncoded` is the text format's
   * concatenated `Cert` / `Chain`; JSON has raw PEM, one certificate per value.
   * Empty values are rejected except for `Subject` / `Issuer`, which Envoy's
   * text format emits as `""` when absent.
   */
  set(key: Key, value: string, percentEncoded: boolean, offset?: number): void {
    if (value === '' && key !== KEY.SUBJECT && key !== KEY.ISSUER) {
      throw reject('EMPTY_VALUE', offset);
    }
    switch (key) {
      case KEY.BY:
        if (!validUri(value)) {
          throw reject('INVALID_URI', offset);
        }
        this.#by.push(value);
        break;
      case KEY.URI:
        if (!validUri(value)) {
          throw reject('INVALID_URI', offset);
        }
        this.uri.push(value);
        break;
      case KEY.DNS:
        if (!validDns(value)) {
          throw reject('INVALID_DNS', offset);
        }
        this.#dns.push(value);
        break;
      case KEY.HASH:
        if (!validHash(value)) {
          throw reject('INVALID_HASH', offset);
        }
        if (this.hash !== null) {
          throw reject('DUPLICATE_KEY', offset);
        }
        this.hash = value;
        break;
      case KEY.SUBJECT:
        checkDn(value, offset);
        if (this.#subject !== null) {
          throw reject('DUPLICATE_KEY', offset);
        }
        this.#subject = value;
        break;
      case KEY.ISSUER:
        checkDn(value, offset);
        if (this.#issuer !== null) {
          throw reject('DUPLICATE_KEY', offset);
        }
        this.#issuer = value;
        break;
      case KEY.CERT: {
        if (this.#cert !== null) {
          throw reject('DUPLICATE_KEY', offset);
        }
        const block = parseCertificate(percentEncoded ? decode(value, offset) : value);
        if (block === undefined) {
          throw reject('INVALID_PEM', offset);
        }
        this.#cert = block.pem;
        this.#certDer = block.der;
        break;
      }
      case KEY.CHAIN:
        if (percentEncoded) {
          // A valid `Chain` is never an empty list, so a non-empty chain means
          // `Chain` was already seen.
          if (this.#presentedChain.length > 0) {
            throw reject('DUPLICATE_KEY', offset);
          }
          const blocks = parseCertificates(decode(value, offset));
          if (blocks.length === 0) {
            throw reject('INVALID_PEM', offset);
          }
          this.#presentedChain.push(...blocks.map((block) => block.pem));
        } else {
          const block = parseCertificate(value);
          if (block === undefined) {
            throw reject('INVALID_PEM', offset);
          }
          this.#presentedChain.push(block.pem);
        }
        break;
    }
  }

  /** The frozen element, once `requireCertHash` holds. */
  finish(requireCertHash: boolean, keepIssuer: boolean, offset?: number): XfccElement {
    if (requireCertHash) {
      if (this.#certDer === null || this.hash === null) {
        throw reject('MISSING_CERT_OR_HASH', offset);
      }
      if (sha256Hex(this.#certDer) !== this.hash) {
        throw reject('HASH_MISMATCH', offset);
      }
    }
    return Object.freeze({
      by: Object.freeze(this.#by),
      hash: this.hash,
      cert: this.#cert,
      presentedChain: Object.freeze(this.#presentedChain),
      subject: this.#subject,
      uri: Object.freeze(this.uri),
      dns: Object.freeze(this.#dns),
      issuer: keepIssuer ? this.#issuer : null,
    });
  }
}

const decode = (value: string, offset: number | undefined): string => {
  const decoded = percentDecode(value);
  if (decoded === null) {
    throw reject('INVALID_PERCENT_ENCODING', offset);
  }
  return decoded;
};
