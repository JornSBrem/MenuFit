<!-- markdownlint-disable-file -->
# Plan: WI-279 Supabase admin login

## Scope

Enable the hosted admin web login on `app.menufit.uk` to authenticate with Supabase email/password instead of the local MenuFit username/password endpoint. Keep the existing token login fallback for development. Add only the minimum backend/public config surface needed to bootstrap the browser login flow without hardcoding secrets in source.

Out of scope:
- Replacing the existing local `/api/v3/auth/login` user flow used elsewhere.
- Full Supabase signup/reset-password UX inside the admin web app.
- Role-management UX changes beyond using existing backend admin-role resolution.

## Success Criteria

- [ ] Admin web can obtain a Supabase access token from email/password and use it against MenuFit admin APIs.
- [ ] Hosted login flow can discover required Supabase config from MenuFit backend instead of asking operators to paste a token.
- [ ] Token-based dev login remains available.
- [ ] Changes are typechecked and tracked.

## Tasks

### Phase 1: Preparation

- [ ] Add WI-279 to backlog and mark it `IN-PROGRESS`.
- [ ] Inspect current backend/admin-web auth flow and identify the minimum integration surface.

### Phase 2: Implementation

- [ ] Add backend support for public Supabase auth bootstrap config and Supabase password-login proxying.
- [ ] Extend runtime config definitions and admin settings allowlist for the new Supabase config key.
- [ ] Update the admin login gate to use Supabase email/password login and preserve the token fallback.

### Phase 3: Validation

- [ ] Run admin-web typecheck and any relevant backend checks.
- [ ] Write the changes file and leave backlog in a consistent state.
