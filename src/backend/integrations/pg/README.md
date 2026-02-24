# PG Integration

Project Gezond integration layer:

- explicit endpoint contract metadata (keys/defaults/required template params) (`endpoint-contract.ts`)
- contract-based URL builders (`endpoint-contract.ts`)
- response-shape assertions for login/week/day/recipe/shoppingList (`endpoint-contract.ts`)
- basic JSON fetch helper with configurable extra headers (`pg-fetch.ts`)
- contract tests (`endpoint-contract.test.ts`)

Authentication/session handling is intentionally deferred to later workitems.
