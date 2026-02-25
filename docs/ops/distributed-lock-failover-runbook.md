# Distributed Lock Failover Runbook

## Runtime Modes

- `STATE_LOCK_BACKEND=file`: local lease file lock only.
- `STATE_LOCK_BACKEND=redis`: external distributed lease lock via Redis.

## Backend Failure Behavior

When `STATE_LOCK_FAIL_OPEN=true`:

1. Backend lock acquisition errors do not block critical writes.
2. Service continues using fail-open mode until backend recovers.
3. Incident must be recorded and investigated.

When `STATE_LOCK_FAIL_OPEN=false`:

1. Critical writes fail fast when lock backend is unavailable.
2. Use this only where strict mutual exclusion is mandatory and upstream retries exist.

## Incident Response

1. Confirm Redis health and connectivity from backend runtime.
2. If backend is degraded, switch to `STATE_LOCK_BACKEND=file` as emergency fallback.
3. After Redis recovery, restore `STATE_LOCK_BACKEND=redis`.
4. Validate lock acquire/renew/release metrics and error logs before closing incident.

## Verification

- Trigger controlled write workload from two instances.
- Confirm no duplicate/corrupt state transitions.
- Confirm fail-open or fail-closed behavior matches configured policy.
