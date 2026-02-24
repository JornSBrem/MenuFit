# Week Read Routes

Baseline `/api/v3/week/*` handler layer:

- `summary`: week plan + match status + cart plan
- `groceries`: grocery totals + reconcile results

This module is framework-agnostic and can be wired into Fastify routes later.
