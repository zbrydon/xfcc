---
'xfcc': minor
---

Initial release

Strict, fail-closed parser for Envoy's `x-forwarded-client-cert` header (text and JSON formats) with an RFC 4514 distinguished name parser. Pure TypeScript with no runtime dependencies.

The defaults close the gaps a crafted text-format SAN can open: `format` is required, `maxElements` defaults to 1, and `issuer` is returned from the text format only with `allowTextIssuer`. The presented chain is `presentedChain`, and `requireCertHash` checks that `Hash` matches `Cert`.

Use `getPeerSpiffeId`, `safeGetPeerSpiffeId` and `spiffeIdOf` to read the calling service's SPIFFE ID from the header as `{ id, trustDomain, path, namespace, serviceAccount }`. Set `requireSingleSan` to also reject an element with any DNS SAN, which a crafted text-format URI SAN can add.
