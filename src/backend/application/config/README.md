# Backend Config

- `create-runtime-config.ts`: builds backend runtime config from environment values.
- `resolve-env-secrets.ts`: resolves secret values via `<KEY>_FILE` fallback.

Behavior:
- direct env value (for example `LLM_API_KEY`) has precedence
- if missing, and `<KEY>_FILE` is set, the secret value is loaded from that file
- unreadable/empty secret files throw `SecretConfigError`
