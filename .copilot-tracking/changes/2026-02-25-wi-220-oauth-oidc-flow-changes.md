# Changes: WI-220 Volledige OAuth/OpenID provider-integratie

## Files Created

### `src/backend/application/auth/oauth-flow-service.ts`
- `OAuthFlowService`: OAuth authorization code flow orchestration
- `buildAuthorizationUrl()`: bouwt IdP redirect URL met state (CSRF bescherming) + scopes
- `handleCallback(params)`: verifieert state, wisselt code in voor tokens via token endpoint, valideert ID token met JwtVerifier (WI-221), mapt claims naar user/admin sessie
- Admin role extractie via `menufit:role` of `roles` claim
- `picnic_account_id` claim support voor user sessiemapping
- `OAuthFlowError` met codes: `OAUTH_MISSING_CODE`, `OAUTH_STATE_MISMATCH`, `OAUTH_MISSING_ID_TOKEN`, `OAUTH_INVALID_ID_TOKEN`, `OAUTH_MISSING_SUB`, `OAUTH_TOKEN_FETCH_ERROR`, `OAUTH_TOKEN_HTTP_ERROR`, `OAUTH_TOKEN_PARSE_ERROR`, `OAUTH_TOKEN_INVALID`
- Volledig testbaar via injectable `fetchFn`, `generateState`, `nowEpochSeconds`

### `src/backend/interfaces/http/auth/oauth-routes.ts`
- `handleOAuthAuthorize()`: GET /auth/oidc/authorize — geeft redirect URL + state terug
- `handleOAuthCallback(service, body)`: POST /auth/oidc/callback — wisselt code in, geeft session token terug
- Input validatie voor code, state, expectedState

### `src/backend/application/auth/oauth-flow-service.test.ts`
- 8 tests: authorization URL, user/admin sessie, state mismatch, lege code, missing id_token, ongeldige signature, token endpoint HTTP error

### `src/backend/interfaces/http/auth/oauth-routes.test.ts`
- 6 tests: authorize URL, callback success, missing code/state/expectedState, state mismatch

## Out of scope (→ workitems)

- PKCE (Proof Key for Code Exchange)
- Server-gedreven refresh token exchange (WI-254)
- Multi-tenant OIDC configuratie
- Concrete IdP provisioning
