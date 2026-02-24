# Auth Session Lifecycle Baseline

Session lifecycle service for WI-207:

- app-session issuance for `user` and `admin` tokens with expiry
- token validation, refresh rotation, and revocation
- provider-session tracking for `pg` and `picnic` access/refresh tokens
- optional persisted auth/provider session state across restarts
