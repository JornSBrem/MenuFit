# Session Context

Token format:
- `user:<subjectId>:<tokenId>:<picnicAccountId>[:<expiresAtEpochSeconds>]`
- `admin:<subjectId>:<tokenId>:<role>[:<expiresAtEpochSeconds>]`

Validation helpers:
- `parseSessionToken(...)`
- `parseAuthorizationHeader(...)`
- `requireUserSession(...)`
- `requireAdminSession(...)`
- `authorizeUserFromBearerHeader(...)`
- `authorizeAdminFromBearerHeader(...)`

Use `SessionValidationOptions.requireExpiry` to enforce token expiry in stricter environments.

Middleware wrappers consume `SessionLifecycleService` to enforce active/revoked/expired checks before route execution.
