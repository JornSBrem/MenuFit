# LLM Integration

Provider adapter baseline for OpenAI and Azure:

- preflight validation for provider, endpoint, api-version, and model/deployment mapping
- unified completion call surface
- guaranteed fallback result on provider failures

This keeps LLM failures non-blocking for primary workflows.
