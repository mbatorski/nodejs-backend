# Node.js backend template

TypeScript Express backend with file-based routes (`src/routes` → `/api/...`), DB-backed services, and JWT auth.

## Layout

| Path | Role |
|------|------|
| `index.ts` | App entry: DB connect, load services, start server |
| `src/routes/` | One file = one endpoint |
| `src/services/` | DB / domain logic (singletons) |
| `src/utils/` | Shared helpers |
| `lib/` | Framework (routes, DB, `Service` / `AsyncService`) — change only when needed |

## Setup

```bash
npm install
cp .env .env.local   # or edit .env
npm run dev          # tsx watch
# or
npm run build && npm start
```

Typical env vars: `APP_PORT`, `APP_HOST`, `CORS_ORIGIN`, `JWT_SECRET`, `ENV_TYPE`, DB credentials used by `lib/database`.

---

## Index (`index.ts`)

Bootstraps the DB, loads services, then mounts routes and starts listening:

```ts
import path from "path";
import dotenv from "dotenv";
import Db from "./lib/database/Database";
import RouteServer from "./lib/routes/objects/RouteServer";

process.env.TZ = "Europe/Warsaw";

dotenv.config();

const server = new RouteServer();

Db.setKeepAliveTable("alive");

Db.onConnect(async () => {
    // Cached `Service` instances need `await X.load()` here.
    // `AsyncService` hits the DB per call — no load.

    server.static("/assets", "assets");
    server.setEndpointPrefix("/api");
    server.initRoutes(path.join(__dirname, "src/routes"));
    server.start(process.env.APP_PORT!);
    server.setTempFilesUploadDir("./assets/private/temp");
});
```

---

## Service (`src/services/`)

One type + class per file, extend `Service<T>` (cached) or `AsyncService<T>` (DB per call), export a singleton. Keep HTTP out of services. With `AsyncService`, always `await` gets/updates.

```ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AsyncService } from "../../lib/service/AsyncService";

type User = {
    id: number;
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    createdAt: number;
    updatedAt: number;
};

class UsersService extends AsyncService<User> {
    #PASSWORD_HASH_SALT_ROUNDS = 12;

    constructor() {
        super({
            table: "users",
            identifier: "id",
            identifierType: "number",
            create: (row) => ({ ...row }),
            save: (obj) => ({ ...obj }),
            update: (obj) =>
                this._reduce(obj, ["id", "createdAt"]),
        });
    }

    async getHashedPassword(password: string) {
        return await bcrypt.hash(password, this.#PASSWORD_HASH_SALT_ROUNDS);
    }

    async getByUsername(username: string) {
        return await this._find({ username });
    }

    async create(data: {
        firstname: string;
        lastname: string;
        username: string;
        password: string;
    }) {
        const id = await this._getNextId();
        data.password = await this.getHashedPassword(data.password);

        return await this._insert(id, {
            ...data,
            id,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
        });
    }

    signJWTToken(user: User) {
        return jwt.sign({ id: user.id }, process.env.JWT_SECRET!);
    }
}

const Users = new UsersService();

export default Users;
```

---

## Endpoint (`src/routes/`)

Path under `src/routes/` maps to the URL with `/api` prefix:

- `src/routes/users/register.ts` → `POST /api/users/register`
- `src/routes/users/login.ts` → `POST /api/users/login`

Chain `Route` with no extra indent. Use `async function` (not arrows). Declare `setBody` / `setQuery` when the handler reads them. Failures use early `return res.error(...)`.

```ts
import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";
import Users from "../../services/Users";

dotenv.config();

export default new Route()
.setBody({
    username: { type: "string", minLength: 3, maxLength: 30 },
    password: { type: "string", minLength: 3, maxLength: 100 },
    firstname: { type: "string", minLength: 1, maxLength: 50 },
    lastname: { type: "string", minLength: 1, maxLength: 50 },
})
.post(async function(res, body) {
    const { username, password, firstname, lastname } = body;

    if (await Users.getByUsername(username)) return res.error(409, "User already exists");

    const user = await Users.create({
        username,
        password,
        firstname,
        lastname,
    });

    const token = Users.signJWTToken(user);

    res._res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.ENV_TYPE === "prod",
    });
    res.sendStatus(200);
});
```

### Useful `Route` helpers

| Method | When |
|--------|------|
| `.jwt()` | Require a verified JWT |
| `.setBody({ ... })` | Validate / type the request body |
| `.setQuery({ ... })` | Validate / type query params |
| `.setServiceObjectFetch(Service)` | Load a DB row from an id in query/body |

JWT-only example (`src/routes/users/authorize.ts` → `POST /api/users/authorize`):

```ts
export default new Route()
.jwt()
.post(async function(res) {
    res.sendStatus(200);
});
```

---

## Conventions

- Flat logic: early `return`, no nested `if`s.
- Routes own HTTP (status, cookies, existence checks); services own reusable / DB work.
- Do not add controllers or repositories — stick to routes + services.
