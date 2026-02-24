# Household Routes

Baseline `/api/v3/households` handlers:

- `bootstrap`: creates household for current user when absent
- `me`: returns household + pending invitation status for current user
- `invite`: head-only invitation creation for a user id
- `accept`: invited user accepts pending invitation
- `revoke`: head-only revocation for pending invitation
- `invitations`: head-only list of household invitations
