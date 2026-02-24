# Session Context

Token format:
- `user:<subjectId>:<tokenId>:<picnicAccountId>[:<expiresAtEpochSeconds>]`
- `admin:<subjectId>:<tokenId>:<role>[:<expiresAtEpochSeconds>]`

Validation helpers:
- `parseSessionToken(...)`
- `parseAuthorizationHeader(...)`
- `requireUserSession(...)`
- `requireAdminSession(...)`

Use `SessionValidationOptions.requireExpiry` to enforce token expiry in stricter environments.
