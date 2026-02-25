# Changes: WI-221 JWT handtekeningverificatie tegen externe IdP sleutels

## Files Created

### `src/backend/integrations/oidc/types.ts`
- Shared OIDC types: `Jwk`, `Jwks`, `JwtHeader`, `JwtClaims`, `VerifiedJwt`, `JwtVerifyOptions`
- `JwtVerifyOptions` ondersteunt `issuer`, `audience`, `clockToleranceSeconds`, `nowEpochSeconds` (testable)

### `src/backend/integrations/oidc/jwks-client.ts`
- `JwksClient`: haalt JWKS op en cached keys by kid
- Ondersteunt configureerbare `cacheMaxAgeMs` en `minRefetchIntervalMs`
- `getKey(kid)`: geeft cached key terug of haalt vers op
- `refreshKeys()`: forceert JWKS refresh voor key rotation scenario
- `JwksClientError` met codes: `JWKS_FETCH_ERROR`, `JWKS_HTTP_ERROR`, `JWKS_PARSE_ERROR`, `JWKS_INVALID_FORMAT`

### `src/backend/integrations/oidc/jwt-verifier.ts`
- `JwtVerifier`: verifieert RS256/RS384/RS512 en ES256/ES384/ES512 JWTs
- Gebruikt Node.js `node:crypto` (`createPublicKey`, `verify`) — geen externe dependencies
- ECDSA signatures: converteert IEEE P1363 → DER formaat voor Node.js crypto
- Claims validatie: issuer, audience (string + array), expiry met clock tolerance
- Auto-refresh JWKS bij unknown kid (key rotation)
- `JwtVerificationError` met codes: `JWT_EMPTY`, `JWT_MALFORMED`, `JWT_MISSING_ALG`, `JWT_UNSUPPORTED_ALG`, `JWT_MISSING_KID`, `JWT_UNKNOWN_KID`, `JWT_INVALID_SIGNATURE`, `JWT_INVALID_ISSUER`, `JWT_INVALID_AUDIENCE`, `JWT_MISSING_EXP`, `JWT_EXPIRED`, `JWT_NOT_VALID_YET`

### `src/backend/integrations/oidc/index.ts`
- Exports alle public classes, errors en types

### `src/backend/integrations/oidc/jwks-client.test.ts`
- 9 tests: caching, re-fetch na expiry, key rotation, HTTP/network/format errors

### `src/backend/integrations/oidc/jwt-verifier.test.ts`
- 12 tests: valid RS256, tampered payload, expired, wrong issuer/audience, array audience, unsupported alg, malformed, missing kid, key rotation auto-refresh, clock tolerance, unknown kid

## Out of scope (→ workitems)

- OAuth authorization code flow wiring (WI-220)
- PS256/EdDSA algorithm support
- Distributed JWKS cache
