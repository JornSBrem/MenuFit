# Plan: WI-221 JWT handtekeningverificatie tegen externe IdP sleutels

## Scope

In scope:
- JWKS client: key fetch, cache, key rotation support
- JWT verifier: RS256/ES256 signature check, claims validatie (iss, aud, exp)
- Pure Node.js built-ins (node:crypto, fetch)
- Unit tests

Out of scope:
- Wiring aan concrete OAuth provider endpoint (zie WI-220)
- PS256/EdDSA algoritmen
- Distributed JWKS cache

## Success Criteria

- [ ] JwksClient haalt JWKS op en cached keys by kid
- [ ] JwksClient herhaalt fetch bij key-not-found of TTL expired
- [ ] JwtVerifier valideert RS256/ES256 JWT handtekening via Node.js crypto
- [ ] JwtVerifier verwerpt tokens met ongeldige iss/aud/exp
- [ ] Sleutelrotatie (nieuw kid) triggert automatische JWKS refresh
- [ ] Unit tests dekken happy path + rotation + expired/wrong claims

## Tasks

### Phase 1: Types + JWKS client

- [ ] `src/backend/integrations/oidc/types.ts`
- [ ] `src/backend/integrations/oidc/jwks-client.ts`
- [ ] `src/backend/integrations/oidc/jwks-client.test.ts`

### Phase 2: JWT verifier

- [ ] `src/backend/integrations/oidc/jwt-verifier.ts`
- [ ] `src/backend/integrations/oidc/jwt-verifier.test.ts`
- [ ] `src/backend/integrations/oidc/index.ts`

### Phase 3: Validation

- [ ] Tests draaien foutloos
- [ ] Geen external packages nodig
