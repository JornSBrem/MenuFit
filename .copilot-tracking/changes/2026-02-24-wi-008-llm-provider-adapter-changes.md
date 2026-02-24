<!-- markdownlint-disable-file -->
# Release Changes: WI-008 LLM provider adapter preflight and fallback

**Related Plan**: 2026-02-24-wi-008-llm-provider-adapter-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added a unified OpenAI/Azure LLM provider adapter with strict preflight checks and guaranteed fallback behavior on failures.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-008-llm-provider-adapter-plan.md` - Added WI-008 implementation plan and checklist.
- `.copilot-tracking/changes/2026-02-24-wi-008-llm-provider-adapter-changes.md` - Added WI-008 release tracking file.
- `src/backend/integrations/llm/types.ts` - Added provider config, completion input/output, and fallback reason contracts.
- `src/backend/integrations/llm/provider-adapter.ts` - Added OpenAI/Azure preflight validation, request mapping, response parsing, and fallback logic.
- `src/backend/integrations/llm/provider-adapter.test.ts` - Added tests for preflight validation, request mapping, and non-blocking fallback.
- `src/backend/integrations/llm/index.ts` - Added LLM integration exports.
- `src/backend/integrations/llm/README.md` - Added module scope and guardrails.

### Modified

- `src/shared/config/default-definitions.ts` - Added `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_AZURE_DEPLOYMENT` runtime config keys.
- `src/backend/integrations/README.md` - Documented LLM preflight/fallback adapter availability.
- `.copilot-tracking/plans/2026-02-24-wi-008-llm-provider-adapter-plan.md` - Marked all WI-008 tasks and criteria complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 10
