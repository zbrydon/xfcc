# Benchmark results

Recorded 2026-11-01 on an otherwise idle laptop, in a single run. Treat differences under about 5% as noise.

- Machine: Apple M4 Pro, macOS 26.5.2
- Node v26.12.1
- Reproduce: `pnpm bench`, which builds the package and benchmarks `dist/`

## Headers

| Benchmark                             | `safeParseXfcc`       | `parseXfcc`           |
| ------------------------------------- | --------------------- | --------------------- |
| text, single element                  | 427k ops/s (2.4 us)   | 427k ops/s (2.4 us)   |
| text, two elements                    | 351k ops/s (2.9 us)   | 351k ops/s (2.9 us)   |
| json                                  | 466k ops/s (2.2 us)   | 471k ops/s (2.2 us)   |
| text, Cert and Chain                  | 48.4k ops/s (20.9 us) | 47.7k ops/s (21.2 us) |
| text, Cert and Chain, requireCertHash | 44.8k ops/s (22.6 us) | 46.5k ops/s (21.8 us) |
| reject, unknown key                   | 2.32M ops/s (0.4 us)  | 1.76M ops/s (0.6 us)  |
| reject, invalid character             | 2.21M ops/s (0.5 us)  | 1.85M ops/s (0.5 us)  |
| reject, too long                      | 2.74M ops/s (0.4 us)  | 2.28M ops/s (0.4 us)  |

## Distinguished names

| Benchmark                      | `parseDistinguishedName` |
| ------------------------------ | ------------------------ |
| simple                         | 1.04M ops/s (1.0 us)     |
| escapes and a multi-valued RDN | 800k ops/s (1.3 us)      |

## Worst cases

Each input is just under the 1 MiB ceiling. Time per call, which grows linearly with the input, so at the default 64 KiB `maxLength` expect about 1/16 of these.

| Benchmark                   | `safeParseXfcc` |
| --------------------------- | --------------- |
| long URI                    | 8.84 ms         |
| percent-encoded URI         | 13.70 ms        |
| many colons in an authority | 17.71 ms        |
| unterminated quote          | 2.53 ms         |
| percent-encoded Cert        | 6.52 ms         |
| Subject of escapes          | 5.52 ms         |
| many DNS pairs              | 20.96 ms        |
| JSON escapes                | 5.86 ms         |
| JSON list                   | 19.73 ms        |
| whitespace                  | 3.43 ms         |

| Benchmark | `parseDistinguishedName` |
| --------- | ------------------------ |
| escapes   | 1.61 ms                  |
| many RDNs | 45.79 ms                 |
| non-ASCII | 4.29 ms                  |
