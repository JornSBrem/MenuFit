<!-- markdownlint-disable-file -->
# Release Changes: WI-282 Supabase gold schema and dual-write foundation

**Related Plan**: `.copilot-tracking/plans/2026-03-12-wi-282-supabase-gold-schema-plan.md`
**Implementation Date**: `2026-03-12`

## Summary

Established the first executable Supabase gold migration foundation for MenuFit: initial schema migrations, a deterministic backfill SQL generator, a `psql`-based backfill script, a parity check script, and an opt-in backend dual-write hook for gold serving writes.

## Changes

### Added

- `/infrastructure/supabase/README.md` - conventions for Supabase schema assets.
- `/infrastructure/supabase/migrations/20260312133000_wi_282_gold_core.sql` - initial gold serving schema for Supabase/Postgres.
- `/docs/SUPABASE_GOLD_SCHEMA_AND_CUTOVER.md` - mapping and cutover notes for local gold -> Supabase gold.
- `/scripts/backfill-supabase-gold.ts` - emits or executes deterministic SQL backfill from local state.
- `/scripts/check-supabase-gold-parity.ts` - compares local state counts to Supabase gold table counts.
- `/src/backend/application/gold/supabase-backfill.ts` - pure SQL builder for full gold backfill.
- `/src/backend/application/gold/supabase-backfill.test.ts` - regression test for deterministic backfill SQL.
- `/src/backend/application/gold/supabase-gold-writer.ts` - opt-in `psql` writer for Supabase gold dual-write.
- `/src/backend/application/gold/supabase-gold-writer.test.ts` - regression test for writer SQL submission.
- `/.copilot-tracking/changes/2026-03-12-wi-282-supabase-gold-schema-changes.md` - delivery record for WI-282.

### Modified

- `/src/backend/application/gold/read-service.ts` - optional Supabase gold writer hook on gold mutations.
- `/src/backend/application/gold/read-service.test.ts` - added dual-write service regression test.
- `/src/backend/server.ts` - backend bootstraps optional Supabase gold dual-write via runtime config.
- `/src/shared/config/default-definitions.ts` - added `SUPABASE_GOLD_DATABASE_URL` and `SUPABASE_GOLD_SYNC_ENABLED` config keys.
- `/workitems/workitems.md` - tracked WI-282 progress and completion state.

### Removed

- None.

## Validation

- `node --test src/backend/application/gold/supabase-backfill.test.ts src/backend/application/gold/supabase-gold-writer.test.ts src/backend/application/gold/read-service.test.ts`
- `node --experimental-strip-types --check scripts/backfill-supabase-gold.ts`
- `node --experimental-strip-types --check scripts/check-supabase-gold-parity.ts`
- `node --experimental-strip-types --check src/backend/application/gold/supabase-gold-writer.ts`
- `node --experimental-strip-types --check src/backend/server.ts`

## Release Summary

**Total Files Affected**: `14`
