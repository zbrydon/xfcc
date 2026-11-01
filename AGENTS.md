# AGENTS.md

Fail-closed parser for Envoy's `x-forwarded-client-cert` header. TypeScript with no runtime dependencies.

Write the least code that works. In order, stop at the first that holds:

1. Does it need to exist? If the need is speculative, skip it.
2. Stdlib or native platform feature.
3. A dependency already installed. No new dependency for what a few lines do.
4. One line. Then the minimum code.

No unrequested abstractions, config for constants, or scaffolding "for later". Prefer deletion. Shortest diff wins.

Never trim: input validation at the trust boundary, fail-closed errors, security, or anything explicitly asked for. Malformed input is an error, never a best-effort parse.

## Commands

- `pnpm test`, `pnpm lint`, `pnpm format`.
- `pnpm bench`: builds, then benchmarks `dist/`.
- `pnpm fuzz parse -max_total_time=60`: coverage-guided, local only. Also `dn`, `options`, `cert`.

## Gotchas

- `src/` coverage is 100%, with no ignore comments. Structure unreachable branches away.
- Do not use `JSON.parse`, `trimEnd` or a backtracking regex on untrusted input in `src/`, and do not trust `Buffer.from(x, 'base64')` to reject anything. Comments at each site say why.
- Package must keep zero `dependencies` and no install scripts. `src/index.test.ts` fails otherwise.
- `test/fixtures/golden.json` pins the parser's behaviour. A change to it is a behaviour change.
- `fuzz/` is its own pnpm workspace, so the fuzzer's dependencies stay out of the main install. It runs on an LTS Node, because Jazzer.js only supports those.
- pnpm pins Node as well as packages: change it with `pnpm runtime set node <version>`.
