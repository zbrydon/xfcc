// Strict RFC 4514 distinguished name parser.
//
// Envoy emits `Subject`/`Issuer` with OpenSSL's `XN_FLAG_RFC2253`, which is
// compatible with RFC 4514 output. Deviations from the RFC grammar, both
// stricter: the obsolete RFC 2253 `;` separator is rejected, and a value that
// decodes to U+0000 is rejected so it cannot truncate strings downstream.
import { reject, type XfccError } from './errors.ts';
import { charTable, hexVal } from './validate.ts';

export interface DnAttribute {
  /** The attribute type as written, e.g. `CN` or `2.5.4.3`. */
  readonly type: string;
  /** The unescaped value, or lowercase hex BER when `encoding` is `hex`. */
  readonly value: string;
  readonly encoding: 'string' | 'hex';
}

const END = -1;
const PLUS = 43;
const COMMA = 44;
const BACKSLASH = 92;
const SPACE = 32;

const ALPHA = charTable('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
const DIGIT = charTable('0123456789');
const DESCR = charTable('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-');
const HEX = charTable('0123456789ABCDEFabcdef');
// `pair = ESC ( ESC / special / hexpair )`
const ESCAPABLE = charTable('\\"+,;<> #=');
// Excluded from every string char class, besides `+`, `,` and `\`.
const FORBIDDEN = charTable('\0";<>');

// Escapes can decode to bytes that are not UTF-8. `ignoreBOM`, because a
// decoded U+FEFF is part of the value.
const UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

class Parser {
  pos = 0;
  readonly #input: Buffer;
  /** Decoded value of the current attribute, reused across attributes. */
  readonly #scratch: Buffer;

  constructor(input: Buffer) {
    this.#input = input;
    // Escapes only shrink a value.
    this.#scratch = Buffer.alloc(input.length);
  }

  /** The next byte, or -1 at the end of the input. */
  #peek(): number {
    return this.#input[this.pos] ?? END;
  }

  /** The next byte or -1, moving past it if there is one. */
  #bump(): number {
    const byte = this.#peek();
    if (byte !== END) {
      this.pos++;
    }
    return byte;
  }

  #err(offset = this.pos): XfccError {
    return reject('INVALID_DN', offset);
  }

  #has(table: Uint8Array): boolean {
    return table[this.#peek()] === 1;
  }

  /** RDNs in string order. */
  distinguishedName(): DnAttribute[][] {
    const rdns: DnAttribute[][] = [];
    if (this.#input.length === 0) {
      return rdns;
    }
    for (;;) {
      const rdn = [this.#attribute()];
      rdns.push(rdn);
      // An attribute only ends at `+`, `,` or the end of the input.
      for (;;) {
        const separator = this.#bump();
        if (separator === END) {
          return rdns;
        }
        if (separator === COMMA) {
          break;
        }
        rdn.push(this.#attribute());
      }
    }
  }

  #attribute(): DnAttribute {
    const type = this.#attributeType();
    if (this.#bump() !== 61) {
      throw this.#err();
    }
    if (this.#peek() === 35) {
      this.pos++;
      return { type, value: this.#hexString(), encoding: 'hex' };
    }
    return { type, value: this.#string(), encoding: 'string' };
  }

  /** `attributeType = descr / numericoid` */
  #attributeType(): string {
    const start = this.pos;
    if (this.#has(ALPHA)) {
      while (this.#has(DESCR)) {
        this.pos++;
      }
    } else if (this.#has(DIGIT)) {
      this.#number();
      let arcs = 1;
      while (this.#peek() === 46) {
        this.pos++;
        this.#number();
        arcs++;
      }
      if (arcs < 2) {
        throw this.#err();
      }
    } else {
      throw this.#err();
    }
    return this.#input.toString('latin1', start, this.pos);
  }

  /** `number = DIGIT / ( LDIGIT 1*DIGIT )` */
  #number(): void {
    const first = this.#bump();
    if (DIGIT[first] !== 1) {
      throw this.#err();
    }
    if (first === 48 && this.#has(DIGIT)) {
      throw this.#err();
    }
    while (this.#has(DIGIT)) {
      this.pos++;
    }
  }

  /** `hexstring = SHARP 1*hexpair`, lowercased, with the `#` already read. */
  #hexString(): string {
    const start = this.pos;
    while (this.#has(HEX)) {
      this.pos++;
      if (HEX[this.#bump()] !== 1) {
        throw this.#err();
      }
    }
    const next = this.#peek();
    if (this.pos === start || (next !== END && next !== PLUS && next !== COMMA)) {
      throw this.#err();
    }
    return this.#input.toString('latin1', start, this.pos).toLowerCase();
  }

  /** `string = [ ( leadchar / pair ) [ *( stringchar / pair ) ( trailchar / pair ) ] ]`, unescaped. */
  #string(): string {
    const scratch = this.#scratch;
    const start = this.pos;
    let length = 0;
    // Whether the most recent byte came from an escape; an unescaped trailing
    // space is invalid.
    let lastEscaped = false;
    let nul = false;
    let ascii = true;
    let last = -1;
    for (;;) {
      const byte = this.#peek();
      if (byte === END || byte === PLUS || byte === COMMA) {
        break;
      }
      if (byte === BACKSLASH) {
        this.pos++;
        last = this.#escape();
        lastEscaped = true;
        nul ||= last === 0;
      } else {
        // leadchar also excludes SPACE and `#`; a leading `#` never gets here
        // because `#attribute` reads it as a hexstring.
        if (FORBIDDEN[byte] === 1 || (this.pos === start && byte === SPACE)) {
          throw this.#err();
        }
        last = byte;
        this.pos++;
        lastEscaped = false;
      }
      ascii &&= last < 0x80;
      scratch[length++] = last;
    }
    if (last === SPACE && !lastEscaped) {
      throw this.#err(this.pos - 1);
    }
    // In UTF-8 a 0x00 byte only ever encodes U+0000.
    if (nul) {
      throw this.#err(start);
    }
    if (ascii) {
      return scratch.toString('latin1', 0, length);
    }
    try {
      return UTF8.decode(scratch.subarray(0, length));
    } catch {
      throw this.#err(start);
    }
  }

  /** `pair`, after the `\` was consumed. */
  #escape(): number {
    const byte = this.#bump();
    if (ESCAPABLE[byte] === 1) {
      return byte;
    }
    const hi = hexVal(byte);
    if (hi === -1) {
      throw this.#err();
    }
    const lo = hexVal(this.#bump());
    if (lo === -1) {
      throw this.#err();
    }
    return hi * 16 + lo;
  }
}

/**
 * Parses an RFC 4514 string into RDNs in string order, which is the reverse of
 * the ASN.1 `RDNSequence` order (most specific first). Offsets are UTF-8 bytes.
 *
 * @throws {XfccError} with code `INVALID_DN`.
 */
export const parseDn = (input: string): DnAttribute[][] =>
  new Parser(Buffer.from(input, 'utf8')).distinguishedName();
