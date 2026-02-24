# Week Read Routes

Baseline `/api/v3/week/*` handler layer:

- `summary`: week plan + match status + cart plan
- `groceries`: grocery totals + reconcile results

Read handlers support exact baseline kcal queries and derived non-baseline kcal profiles when a matching week/basePersons baseline exists.

This module is framework-agnostic and can be wired into Fastify routes later.
