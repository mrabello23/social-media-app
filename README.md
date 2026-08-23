# Back-end Social Media App

A small Express and TypeScript backend for creating posts, reposts, quote posts, user profiles, and feeds. PostgreSQL is started with Docker Compose and accessed through `pg-promise`.

> This project is a learning/prototype implementation. The known limitations below are important when running it: the current HTTP validation checks are inverted, so valid requests may be rejected before reaching the use cases. The use-case tests pass because they bypass the HTTP routes.

## Quick Start

### Prerequisites

- Node.js 16 or newer
- npm
- Docker with Docker Compose

### Install and run

```sh
npm install
docker-compose up -d
copy .env-example .env
npm run build
npm start
```

The API listens on `http://localhost:3000` by default. Check it with:

```sh
curl http://localhost:3000/
```

Stop PostgreSQL with:

```sh
docker-compose down
```

The database initialization scripts run when the PostgreSQL volume is created for the first time. To recreate the database from scratch, remove the Compose volume after stopping the service.

### Development and tests

```sh
npm run dev
npm test
npx eslint src tests/
```

`npm test` runs Jest with `dotenv/config`. The tests are primarily use-case tests with mocked adapters; they do not provide full HTTP-to-database integration coverage.

## Configuration

Create `.env` from `.env-example`:

```env
ENVIRONMENT=LOCAL
PORT=3000
DB_CONNECTION=postgres://postgres:passworddb@localhost:5432/postgres
```

The application currently defaults missing values to empty strings, so a missing or malformed configuration should be treated as a startup/configuration error rather than relying on the defaults.

## API

Base URL: `http://localhost:3000`

| Method | Endpoint             | Purpose                               |
| ------ | -------------------- | ------------------------------------- |
| GET    | `/`                  | Health check                          |
| POST   | `/v1/post/feed`      | Get the first page of the feed        |
| POST   | `/v1/post`           | Create an original post               |
| POST   | `/v1/repost`         | Create a repost                       |
| POST   | `/v1/quote-post`     | Create a quote post                   |
| POST   | `/v1/user/profile`   | Get a profile and its first-page feed |
| GET    | `/v1/user/:username` | Get a user by username                |

### Request payloads

Create an original post:

```json
{
  "user": "efe38133-df4c-4ab5-b9c2-d585931eb946",
  "text": "A post"
}
```

Create a repost or quote post:

```json
{
  "user": "efe38133-df4c-4ab5-b9c2-d585931eb946",
  "text": "My comment",
  "original_post_id": "post-uuid"
}
```

Get a feed:

```json
{
  "userId": "efe38133-df4c-4ab5-b9c2-d585931eb946",
  "from": "2023-01-10 00:00:00",
  "to": "2023-01-15 23:59:59"
}
```

All feed fields are optional. `userId` selects the user's posts; `from` and `to` filter by `created_at`. The current implementation always returns page 1. The create routes currently read `user`, while the feed/profile routes use `userId`; this inconsistency should be resolved before treating the API contract as stable.

An Insomnia collection with example requests is available at [docs/Insomnia_2023-01-27.json](docs/Insomnia_2023-01-27.json).

## Business Rules

- Post and quote text must be non-empty and no longer than 777 characters.
- A user is intended to create at most five posts, reposts, or quote posts per day.
- Reposts require an `original_post_id` and are intended to reject reposting a repost.
- Quote posts require an original post and are intended to reject quote nesting.
- PostgreSQL foreign keys require valid users and valid quote targets.

These rules are enforced in entities/use cases only partially. The daily limit is a read-then-write check and is not safe under concurrent requests. Repost targets are not protected by a foreign key in the current schema.

## Architecture

The code follows a clean-architecture-inspired layered design:

```text
Express routes
  -> controllers
    -> use cases
      -> repository interfaces
        -> PostgreSQL adapters
          -> PostgreSQL
```

- `src/server.ts` creates the Express application and mounts the routers.
- `src/routes/` maps HTTP requests, performs cache checks, and composes dependencies.
- `src/controllers/` translates route data into use-case inputs.
- `src/usecases/` contains application rules for posts, quotes, feeds, and profiles.
- `src/entities/` contains domain objects and basic validation.
- `src/infra/repositories/` defines repository ports/interfaces.
- `src/infra/adapters/` implements those ports with parameterized SQL.
- `src/infra/Database.ts` defines the database boundary.

The main patterns are repository, ports-and-adapters, constructor dependency injection, entity objects, use-case services, and cache-aside middleware. Dependencies are composed directly in the route modules instead of through a separate composition root or container.

## Data Model

- `user`: identity and profile data.
- `post`: original posts and reposts. Reposts point to `original_post_id` and set `repost = true`.
- `quotes`: quote posts pointing to a row in `post`.

Feeds return `posts` and `quotes` as separate arrays. They are not merged into one chronological list, and each array is paginated independently.

## Known Gaps and Recommended Order

1. Fix and test route validation; use consistent field names and return 400 for malformed input.
2. Add authentication and derive the acting user from the authenticated identity instead of the request body.
3. Return explicit not-found results and map them to 404 responses.
4. Add a foreign key for `post.original_post_id` and validate target types explicitly.
5. Enforce the daily quota transactionally, preferably with a database-backed counter or transaction/locking strategy.
6. Finish pagination and merge posts/quotes into one ordered feed if that is the product requirement.
7. Include all filters in cache keys and invalidate feed caches after writes, or move caching to a shared cache such as Redis.
8. Add route, adapter, schema, error-handling, and concurrency tests.
9. Validate environment variables at startup and replace broad `any` database types with explicit result types.

Potential scaling improvements such as an API gateway, rate limiting, containers, Redis, or an ORM should come after correctness, identity, data integrity, and integration-test coverage are addressed.

## Test Data

| User   | ID                                     | Username  | Email             |
| ------ | -------------------------------------- | --------- | ----------------- |
| User 1 | `efe38133-df4c-4ab5-b9c2-d585931eb946` | `usr1abc` | `user1@email.com` |
| User 2 | `ceddaba1-fccb-4e43-a5da-5daa7e7b4b23` | `usr2abc` | `user2@email.com` |
| User 3 | `ba071706-dcc0-446c-b089-f190962af5b6` | `usr3abc` | `user3@email.com` |
| User 4 | `b5ea93f0-30b0-4d23-a805-9fb299ef6c8a` | `usr4abc` | `user4@email.com` |
