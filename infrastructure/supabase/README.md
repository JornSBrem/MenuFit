# Supabase Schema Assets

This directory contains Supabase/Postgres migration assets for MenuFit.

Current focus:
- `gold` serving schema for week plans, recipes and shopping data
- minimal user-facing tables that belong next to gold serving reads
- cutover-safe migration path from local state store toward Supabase-backed serving

Conventions:
- migrations are append-only
- no manual schema edits in production
- RLS is intentionally deferred until auth/role consolidation work (`WI-281`)
