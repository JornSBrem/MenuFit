# Production Redis Setup for Distributed Locks (WI-226)

Redis provisioning assets for external distributed lease locks.

## Assets

- `redis-cache.bicep`: Azure Cache for Redis resource template.
- `redis-cache.parameters.example.json`: example parameters.
- `deploy-prod-redis.sh`: non-interactive deployment wrapper.

## Runtime Wiring

Configure backend runtime to use Redis lock backend:

- `STATE_LOCK_BACKEND=redis`
- `STATE_LOCK_REDIS_URL=redis://:<access-key>@<host>:6380`
- `STATE_LOCK_REDIS_KEY_PREFIX=menufit:locks`
- `STATE_LOCK_FAIL_OPEN=true` (recommended operational fallback)

## Deploy

```bash
chmod +x infrastructure/environments/prod/redis/deploy-prod-redis.sh
infrastructure/environments/prod/redis/deploy-prod-redis.sh \
  <resource-group> \
  infrastructure/environments/prod/redis/redis-cache.parameters.example.json
```

For failover handling and incident response, see `docs/ops/distributed-lock-failover-runbook.md`.
