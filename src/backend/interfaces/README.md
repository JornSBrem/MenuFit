# Interfaces Layer

Entry points into backend use-cases:

- HTTP routes/controllers
- CLI commands
- job triggers

Interfaces translate transport payloads into application commands.

Session separation baseline:
- user and admin sessions are represented as distinct context types in `interfaces/http/auth/`.
