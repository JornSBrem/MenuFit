# Integrations Layer

Integrations connect to external dependencies:

- Project Gezond endpoints
- Picnic API
- LLM providers (OpenAI/Azure) with preflight + fallback adapter (`llm/`)
- persistence and storage adapters

Keep external API specifics in this layer only.
