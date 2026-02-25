# Plan: WI-220 Volledige OAuth/OpenID provider-integratie voor loginflows

## Scope

In scope:
- OAuth authorization code flow: auth URL builder + code exchange
- OIDC ID token claims → user/admin sessie mapping
- Backend route handlers: /auth/oidc/login (redirect), /auth/oidc/callback (code exchange)
- State parameter CSRF protection
- Provider claims vertaling naar AppSessionRecord
- Unit tests

Out of scope:
- Concrete IdP configuratie/provisioning (tenant/client registratie)
- PKCE (Proof Key for Code Exchange)
- Refresh token flow naar IdP (zie WI-254)
- Multi-tenant OIDC

## Success Criteria

- [ ] OAuthFlowService bouwt authorization URL met state + nonce
- [ ] OAuthFlowService wisselt authorization code uit voor tokens via token endpoint
- [ ] ID token claims worden gevalideerd met JwtVerifier (WI-221)
- [ ] Claims vertaald naar user/admin sessie via SessionLifecycleService
- [ ] State parameter beschermt tegen CSRF
- [ ] Route handlers: GET /auth/oidc/authorize + POST /auth/oidc/callback
- [ ] Unit tests voor alle paden

## Tasks

### Phase 1: OAuth flow service

- [ ] `src/backend/application/auth/oauth-flow-service.ts`
- [ ] `src/backend/application/auth/oauth-flow-service.test.ts`

### Phase 2: Route handlers

- [ ] `src/backend/interfaces/http/auth/oauth-routes.ts`
- [ ] `src/backend/interfaces/http/auth/oauth-routes.test.ts`

### Phase 3: Validation

- [ ] Tests draaien foutloos
