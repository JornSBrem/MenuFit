---
description: 'Swift and SwiftUI standards for the MenuFit end-user iOS application.'
applyTo: 'src/ios-user-app/**,src/shared/**'
---

# MenuFit iOS SwiftUI Standards

## App Layering

- Keep SwiftUI views focused on rendering and interaction.
- Keep business orchestration in view models/services, not directly in views.
- Keep user-app behavior separate from admin-only capabilities.

## State and Concurrency

- Use explicit view states for loading, success, empty, and error.
- Use structured concurrency (`async/await`) and cancel obsolete tasks.
- Ensure UI-bound state updates happen on the main actor.

## API and Contracts

- Consume typed API models and map them to view models explicitly.
- Keep network layer centralized with consistent request and error handling.
- Align client models with shared/backend contract changes in the same task.

## Mobile UX and Reliability

- Optimize primary flows for iPhone-first navigation and readability.
- Handle offline, timeout, and retry scenarios gracefully.
- Add tests for key user flows and critical transformations.
