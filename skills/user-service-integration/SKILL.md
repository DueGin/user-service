---
name: user-service-integration
description: Integrate an application with this User Service authentication system. Use when Codex needs to add third-party login, SSO-like redirect authorization-code flow, default login page usage, token exchange, refresh/logout/session handling, or embedded iframe/popup auth for another web system that will connect to User Service.
---

# User Service Integration

## Goal

Add User Service authentication to another application using the existing public auth pages and APIs. Prefer the redirect authorization-code flow because it keeps `apiSecret` on the application server.

## Read First

- Read `references/api-contract.md` before writing integration code.
- Read `references/implementation-patterns.md` when generating server routes, callbacks, or framework-specific examples.
- Inspect the target app's existing auth/session/cookie conventions before adding new dependencies or route names.

## Default Flow

1. Register the target app in User Service "应用管理".
2. Configure callback URL and allowed origins.
3. Add server env vars in the target app:
   - `USER_SERVICE_BASE_URL`
   - `USER_SERVICE_APP_ID`
   - `USER_SERVICE_API_SECRET`
   - `USER_SERVICE_CALLBACK_URL`
4. Add a start-login endpoint that creates a random `state`, stores it in an httpOnly cookie/session, then redirects to:
   `/auth/login?app_id=...&redirect_uri=...&mode=redirect&state=...&app_name=...`
5. Add a callback endpoint that validates `state`, receives `code`, then exchanges it on the server:
   `POST /api/auth/exchange` with `{ code, appId, apiSecret }`.
6. Store returned tokens in the target app's session layer or httpOnly cookies.
7. Use `GET /api/auth/me` with the access token to hydrate the current user.
8. Use `POST /api/auth/refresh` to rotate expired access tokens.
9. Use `POST /api/auth/logout` and clear local app cookies on logout.

## Security Rules

- Never expose `USER_SERVICE_API_SECRET` to browser code.
- Always validate `state` in the callback.
- Store tokens in httpOnly cookies or server-side sessions, not localStorage.
- Treat auth codes as one-time and short-lived.
- Make the callback origin match the application's configured `callbackUrl` origin.
- Verify `event.origin` when using embedded mode.

## Implementation Decisions

- Use redirect mode unless the user explicitly asks for iframe/popup embedded login.
- For Next.js, prefer Route Handlers under `app/api/auth/user-service/*`.
- For Express/Koa/Nest, prefer server routes under `/auth/user-service/start` and `/auth/user-service/callback`.
- Keep the app's own auth boundary: the business app owns its session after token exchange.
- If the app already has a session library, adapt to it instead of replacing it.
- If no session system exists, use secure httpOnly cookies as the minimal implementation.

## Embedded Mode

Use only when the business UI must keep users inside a modal/iframe/popup. Build the URL with:

`/auth/login?app_id=...&mode=embed&origin=...&app_name=...`

Listen for `AUTH_SUCCESS` and `AUTH_ERROR` messages. Always reject messages whose `event.origin` is not `USER_SERVICE_BASE_URL`.

## Common Failure Checks

- `应用验证失败`: `appId` or `apiSecret` is wrong.
- `应用不存在或已被禁用`: app was not created or is disabled.
- `回调地址不匹配`: configured callback origin differs from requested `redirect_uri` origin.
- `授权码已使用`: callback retried with the same code.
- `授权码已过期`: user waited too long after login.
- Callback never reached: login URL is missing `app_id`, `redirect_uri`, or `mode=redirect`.

## Deliverables

When using this skill, produce:

- A short summary of chosen flow and route names.
- The env vars the target app must set.
- Server routes for start-login, callback, session/me, refresh, and logout as appropriate.
- Client UI changes that call the app's own start-login/logout routes.
- Verification steps, including one successful login round-trip.
