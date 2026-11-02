# Agent rules

## Code style

- Prefer flat logic: early `return`, no nested `if`s.
- Endpoint-only logic stays in the route (HTTP status, cookies, existence checks). Services hold reusable / DB work only.
- Use early `return res.error(code, message)` for failures.

## Routes (`src/routes/`)

- One file = one endpoint. Path under `src/routes/` maps to the URL (prefix `/api`).
- Chain `Route` with **no extra indent**:

```ts
export default new Route()
.setBody({
    username: { type: "string", minLength: 3, maxLength: 30 },
})
.post(async function(res, body) {
    const { username } = body;
    // ...
});
```

- Always use `async function` in `.get` / `.post` / etc. — never arrow functions.
- Always declare `setQuery` / `setBody` when the handler reads query / body. Each field is inline validation props (`type`, `minLength`, `maxLength`, `optional`, …).
- Destructure fields: `const { a, b } = body` / `const { a, b } = query`.
- Auth: `.jwt()` when the endpoint needs a verified token.
- Need a DB row from id in query/body: `.setServiceObjectFetch(Service)`.

## Services (`src/services/`)

- Every DB-backed service has its **own type** in the same file and extends `Service<ThatType>` or `AsyncService<ThatType>`.
- Export a singleton: `const X = new XService(); export default X;`.
- `Service`: in-memory cache. Call `await X.load()` in `Db.onConnect` before serving.
- `AsyncService`: no cache — every get/update/delete hits the DB and returns a `Promise`. Always `await` fetches (`get`, `update`, `_has`, …). No `load()` needed.
- Do not put route/HTTP concerns in services.

## Layout

- App code: `src/` (routes, services, utils).
- Framework: `lib/` — change only when the task requires it.
- Do not invent layers (controllers, repositories) beyond routes + services.

## Debugging routes

- Every request/response is logged to `./assets/private/logs/`, one file per day (`DD.MM.YYYY.log`), one JSON line per request (`url`, `method`, `payload`, `responseCode`, `response`, `error`, `datetime`).
- When debugging route behaviour (payloads received, responses sent), check that directory instead of guessing.
