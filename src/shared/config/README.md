# Runtime Config Subsystem

This module provides:

- typed config key registry
- metadata flags per key:
  - `hotReload`
  - `sensitive`
  - `restartRequired`
- runtime get/set with parsing and validation
- public-safe config projection with redacted sensitive values

Backend integration also supports `<KEY>_FILE` fallback for secret loading, so secrets can be sourced from mounted secret files instead of inline env values.
