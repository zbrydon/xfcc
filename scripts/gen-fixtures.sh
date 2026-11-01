#!/usr/bin/env bash
# Regenerates the certificate fixtures used by the tests.
# Requires OpenSSL 3. Output is committed; keys are throwaway and not committed.
set -euo pipefail

out="$(cd "$(dirname "$0")/../test/fixtures" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 36500 \
  -keyout "$tmp/ca.key" -out "$out/ca.pem" \
  -subj "/C=US/O=Lyft/CN=Test CA"

leaf() {
  local name="$1" subj="$2" san="$3"
  openssl req -new -utf8 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
    -keyout "$tmp/$name.key" -out "$tmp/$name.csr" -subj "$subj"
  openssl x509 -req -in "$tmp/$name.csr" -CA "$out/ca.pem" -CAkey "$tmp/ca.key" \
    -days 36500 -set_serial "0x$(openssl rand -hex 8)" \
    -extfile <(printf 'subjectAltName=%s\n' "$san") -out "$out/$name.pem"
  openssl x509 -in "$out/$name.pem" -outform DER | openssl dgst -sha256 -r | cut -d' ' -f1 > "$out/$name.sha256"
  # Envoy formats Subject/Issuer with XN_FLAG_RFC2253.
  openssl x509 -in "$out/$name.pem" -noout -subject -nameopt RFC2253 | sed 's/^subject=//' > "$out/$name.subject"
  openssl x509 -in "$out/$name.pem" -noout -issuer -nameopt RFC2253 | sed 's/^issuer=//' > "$out/$name.issuer"
}

leaf client "/C=US/ST=CA/L=San Francisco/OU=Lyft/CN=Test Client" \
  "URI:http://testclient.lyft.com,DNS:lyft.com,DNS:www.lyft.com"

# A subject designed to break naive parsers: an escaped comma that looks like a
# second RDN, quotes, a backslash, a multi-valued RDN, leading/trailing spaces,
# a leading '#' and non-ASCII UTF-8.
leaf nasty "/C=US/O=Lyft/OU=a\"b\\\\c/CN=evil\\,O=Admin+UID=  #pad /description=caf$(printf '\xc3\xa9')" \
  "URI:spiffe://cluster.local/ns/default/sa/nasty"
