<!-- markdownlint-disable-file -->
# Plan: wi-269-ios-supabase-config-detection

## Scope

In scope:
- Diagnose why iOS onboarding auth flow sets `supabaseAuth` to `nil` even when Supabase values are present in `Info.plist`.
- Harden `AppEnvironment` config loading to support compatible Supabase key aliases and trim/validate values.
- Improve user-facing error text for missing Supabase config so support/debugging is actionable.

Out of scope:
- Server-side Supabase JWT verification changes.
- Introducing secrets via source control.
- Changes to onboarding/business flow unrelated to config loading.

## Success Criteria

- [ ] `AppEnvironment` resolves Supabase URL/key from canonical keys and common aliases.
- [ ] Whitespace-only values are treated as missing and do not silently produce invalid config.
- [ ] Login/register error clearly identifies which Supabase config keys are missing.

## Tasks

### Phase 1: Preparation

- [ ] Inspect iOS config loading and auth initialization path.
- [ ] Confirm expected plist keys versus practical operator input variants.

### Phase 2: Implementation

- [ ] Implement resilient Supabase plist key resolution (aliases + trimming).
- [ ] Add explicit runtime diagnostics in auth flow for missing config.

### Phase 3: Validation

- [ ] Run focused checks (build/static checks where feasible).
- [ ] Update tracking changes file with delivered modifications and validation notes.
