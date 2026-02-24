# Household Service Baseline

Application household workflow for WI-201:

- bootstrap household with `head` membership for first user
- invite lifecycle for members (`pending`, `accepted`, `revoked`)
- head-only invite/revoke operations
- invitee-only accept operation with automatic revocation of stale pending invites
- optional persisted household + invitation state across service restarts
