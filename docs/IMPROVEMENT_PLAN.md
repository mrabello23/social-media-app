# Improvement and Fixes Plan

## Purpose

This document is the execution plan for taking the project from a learning/prototype backend to a dependable API. It is based on the current implementation in `src/`, the PostgreSQL schema in `.docker/pg_init_scripts/`, and the existing Jest suite.

The project currently builds successfully, has 31 passing tests, and reports zero npm audit vulnerabilities. Those checks do not cover the most important risks: authentication, SQL adapter behavior, database integrity, and concurrent writes.

## Implementation Status

- **Completed:** dependency refresh and audit remediation; app/server separation; standardized route fields; basic required-field HTTP validation; route regression tests.
- **Current milestone:** P0 route contract is complete at the basic success/failure level. Edge-case validation and security hardening remain.
- **Next milestone:** authentication and authorization, followed by persistence integrity and transactional quota enforcement.
- **Current verification:** 6 Jest suites and 31 tests pass; build passes; audit reports zero vulnerabilities; changed-file lint passes with zero errors.

## Priority Model

- **P0 - Blocker:** security or correctness failure that makes the API unusable or permits unauthorized actions.
- **P1 - Critical:** data integrity, concurrency, or contract problem that can corrupt behavior in normal operation.
- **P2 - Important:** missing production behavior, observability, or meaningful test coverage.
- **P3 - Improvement:** maintainability, performance, and future scaling work.

## Definition of Done Rules

These rules apply to every phase and every milestone:

1. The implementation, tests, schema changes, configuration, and documentation agree with one another.
2. The phase's Definition of Done is satisfied with observable evidence; an unchecked task is not considered complete.
3. New behavior has a focused automated test. Bug fixes include a regression test that fails before the fix.
4. Existing tests continue to pass, and no new lint errors or TypeScript/build errors are introduced.
5. API or database contract changes include updated request examples, migration notes, and rollback considerations.
6. Security-sensitive changes include threat review, negative tests, and confirmation that secrets and sensitive payloads are not logged.
7. A reviewer verifies the architectural boundaries and consistency checklist below before the phase is marked complete.
8. The change is small enough to review and can be reverted or migrated independently.

Do not mark a phase complete because a command passed if that command does not exercise the changed boundary. Passing use-case unit tests alone does not prove that routes, adapters, PostgreSQL constraints, authentication, or concurrency behavior work.

## Edge-Case Testing Rules

Every changed behavior must be tested with success, failure, boundary, and unexpected-input cases. At minimum, tests should cover the following where the behavior applies:

- Missing fields, `null`, empty strings, whitespace-only strings, wrong primitive types, extra fields, and duplicated fields.
- Minimum and maximum accepted values, one below/above each limit, Unicode text, long payloads, invalid UUIDs, and invalid date strings.
- Missing records, duplicate records, deleted targets, foreign-key violations, database timeouts, rejected queries, and empty result sets.
- Date boundaries at midnight, month/year changes, leap days, timezone changes, only-`from`, only-`to`, reversed ranges, and equal start/end values.
- Pagination at the first page, last page, empty page, invalid page/cursor, duplicate ordering timestamps, and changing data between requests.
- Authentication missing, malformed, expired, revoked, valid, wrong-user, privilege escalation, and replay cases.
- Quota counts at zero, four, exactly five, above five, different action types, a new day, and concurrent requests.
- Cache misses, hits, expired entries, distinct filters/users, write invalidation, stale reads, serialization failures, and cache outages.
- Repeated requests, large request rates, oversized bodies, slow dependencies, malformed JSON, and unexpected exceptions.

For each bug found during review, first add a regression test that reproduces it. The test must fail against the old behavior and pass after the fix. Prefer table-driven tests for input matrices and deterministic fake clocks/IDs for date, quota, and ordering cases.

### Edge-case completion threshold

A phase is not complete when only its happy path passes. Its Definition of Done must include:

- At least one test for each applicable category above.
- Boundary tests immediately below, at, and immediately above every numeric or length limit.
- Negative-path tests asserting both the response/error classification and that no invalid state was written.
- A failure-path test for each external dependency changed by the phase.
- A regression test for every P0/P1 defect fixed in the phase.

If a category is intentionally not applicable, record the reason in the pull request review instead of silently omitting it.

## Verification Ruleset

Run this gate from a clean working tree and a supported Node.js version. PostgreSQL and a configured `.env` are required for integration tests.

### Required commands

```sh
npm ci
docker-compose up -d
npm run build
npm test -- --runInBand
npx eslint src tests/
npm audit --audit-level=low
git diff --check
docker-compose down
```

The gate passes only when:

- The build exits successfully.
- All tests pass, including new tests for the changed boundary.
- ESLint reports zero errors. Existing warnings must not increase without an explicit reason.
- `npm audit --audit-level=low` reports zero vulnerabilities.
- The database starts from a clean or explicitly migrated schema and integration tests pass.
- `git diff --check` reports no whitespace errors.
- No generated output, local `.env` file, credentials, tokens, or database dumps are included in the change.

### Security review gate

For every phase, review the change for:

- Authentication and authorization: identity comes from trusted authentication state, not client-controlled fields.
- Input handling: required fields, types, lengths, UUIDs, dates, body size, and invalid combinations are rejected.
- Injection and data exposure: SQL remains parameterized; errors, logs, cache values, and responses do not expose secrets or internals.
- Resource abuse: rate limits, pagination limits, timeouts, decompression/body limits, and expensive queries are bounded.
- Dependency and supply chain state: lockfile is updated, `npm audit` is clean, and major upgrades are reviewed rather than forced.
- Database security: least-privilege credentials, password hashing, foreign keys, transaction boundaries, and safe migrations are present where relevant.

Any unmitigated P0 security finding blocks completion. A P1 finding requires either a fix in the same phase or a documented owner and deadline before release.

### Architecture review gate

Confirm that:

- Routes handle transport concerns only and do not contain domain rules or SQL.
- Controllers translate HTTP data and delegate to use cases.
- Use cases depend on repository interfaces, not PostgreSQL or Express implementations.
- Entities contain domain invariants without knowing about HTTP, SQL, or cache behavior.
- Adapters map database rows and handle empty results explicitly.
- Cross-record rules and writes use a transaction when atomicity is required.
- Dependency construction remains in the composition root/routes and does not leak into domain code.
- Shared concerns such as validation, errors, authentication, logging, and caching have one clear owner.

An architecture review fails when a new dependency crosses inward into the domain, duplicates a shared rule inconsistently, or bypasses a required transaction/authorization boundary.

### Consistency review gate

Compare the implementation against all project contracts before closing a phase:

- `README.md` endpoint names, fields, status codes, setup, and limitations.
- `docs/Insomnia_2023-01-27.json` request examples.
- Route input/output types and controller mappings.
- Entity invariants and use-case rules.
- Repository interfaces and adapter SQL parameters.
- PostgreSQL tables, constraints, indexes, and migrations.
- Tests for success, validation failure, not-found, authorization, database failure, and concurrency cases where applicable.

The review is consistent only when each contract describes the same field names, nullability, status codes, pagination semantics, timezone, authorization model, and business limits. Record any intentional exception in the README and the phase's migration note.

### Evidence required in the pull request

Every phase PR should include:

- Scope and risk summary.
- Commands run and their results.
- Tests added or changed, including the boundary they exercise.
- Security review result and unresolved findings.
- Architecture and consistency checklist result.
- Database migration/rollback notes when schema changes are included.
- Documentation updates for changed public behavior.

## Recommended Execution Order

### Phase 0: Establish a reliable baseline (P0)

**Goal:** Make failures reproducible and create a safety net before changing behavior.

Tasks:

- Add route-level tests using an HTTP test client such as Supertest.
- Add adapter tests with a fake `Database` implementation that asserts SQL and parameters.
- Add edge-case and negative-path cases for every endpoint and adapter boundary, not only successful requests.
- Add a test command that runs consistently in CI, including coverage thresholds once coverage is representative.
- Add a CI workflow for install, audit, build, test, and lint.
- Keep the dependency lockfile committed and run `npm audit` in CI.

Definition of Done:

- Every public endpoint has at least one valid-request and one invalid-request test.
- Each endpoint has tests for missing/null/wrong-type input, boundary values, empty results, dependency failure, and no-write-on-failure behavior where applicable.
- The build, test, lint, and audit checks run from a clean checkout.
- A failing HTTP request identifies the route and response status rather than only failing inside a use case.

Why first: the original tests mocked the adapters and bypassed the routes, which allowed major HTTP defects to remain invisible. Basic route coverage now exists; adapter and edge-case coverage is still required.

### Phase 1: Restore the HTTP contract (P0)

**Goal:** Make valid requests work and invalid requests fail predictably.

Tasks:

- Fix the inverted presence checks in `src/routes/v1/post-router.ts` and `src/routes/v1/user-router.ts`.
- Choose one request field name, preferably `userId`, and use it consistently across all endpoints.
- Validate UUIDs, required strings, string length, date formats, and mutually valid date ranges at the route boundary.
- Use HTTP 400 for malformed input instead of HTTP 500.
- Add centralized async error handling and a consistent error response shape.
- Return 201 for successful creation where appropriate.
- Remove request-specific cache-key state from `req.params`; calculate keys from validated input.

Definition of Done:

- The documented Insomnia requests reach the controllers successfully.
- Missing or malformed fields return 400.
- Unexpected database failures return 500 without exposing internal details.
- Route tests cover all create, feed, and user endpoints.

Dependencies: Phase 0.

### Phase 2: Add identity and authorization (P0)

**Goal:** Prevent users from impersonating one another.

Tasks:

- Define the authentication model: session or JWT, token expiry, refresh behavior, and logout/revocation expectations.
- Hash passwords with a modern password-hashing library; never store or return `userpass` in plaintext.
- Add authentication middleware that establishes the current user on the request.
- Stop accepting the acting user as an authoritative request-body value for writes.
- Enforce authorization for profile and feed access according to the product requirement.
- Add rate limiting and sensible request-body size limits.

Definition of Done:

- An unauthenticated write returns 401.
- A user cannot create content as another user by changing JSON input.
- Passwords are never logged, returned, or stored in plaintext.
- Authentication and authorization tests cover success, missing credentials, invalid credentials, and cross-user access.

Dependencies: Phase 1 for stable request/error handling.

### Phase 3: Make persistence and domain rules correct (P1)

**Goal:** Ensure database state matches the business rules.

Tasks:

- Change repository `getById` methods to return `Post | null`, `Quote | null`, and `User | null` for missing rows.
- Map missing users and posts to 404 responses.
- Add a foreign key from `post.original_post_id` to `post.id`, with an explicit delete policy.
- Validate that repost targets exist before saving.
- Make quote validation query the correct target type and express quote nesting rules explicitly.
- Normalize date handling with typed date values or a shared UTC/date-range utility. Fix the zero-based month issue in `QuotePostUseCase`.
- Persist `created_at` consistently or stop constructing unused timestamps in entities.
- Add indexes for feed queries, user/date filters, and foreign keys.
- Replace raw `any` database results with typed row/result boundaries.

Definition of Done:

- Invalid references cannot be persisted.
- Missing records produce predictable null results and HTTP 404 responses.
- Date filters behave correctly across month and timezone boundaries.
- Adapter tests verify empty results, SQL parameters, and mapping behavior.

Dependencies: Phase 0 and Phase 1. Authentication from Phase 2 is strongly recommended before exposing writes broadly.

### Phase 4: Enforce quotas transactionally (P1)

**Goal:** Enforce the five-actions-per-day rule under concurrent traffic.

Tasks:

- Define the quota timezone explicitly.
- Replace the read-then-write sequence with a transaction and locking strategy, or maintain a database-backed daily counter.
- Unify the limit comparison and include posts, reposts, and quotes through one quota abstraction.
- Check quota and insert the new record atomically.
- Add concurrent test cases that attempt more than five writes at the same time.

Definition of Done:

- No concurrent execution can create more than five daily actions for a user.
- The behavior is identical for original posts, reposts, and quote posts.
- A failed insert or rejected quota check leaves no partial state.

Dependencies: Phase 3 persistence work.

### Phase 5: Finish feed semantics and caching (P1/P2)

**Goal:** Make feed results correct, navigable, and safe to cache.

Tasks:

- Accept and validate a page/cursor in feed requests.
- Decide whether the API returns one merged chronological timeline or separate post and quote collections.
- Prefer cursor pagination for a changing feed; otherwise define stable ordering with a timestamp and ID tie-breaker.
- Include every filter, page/cursor, and authenticated user scope in cache keys.
- Invalidate affected profile and homepage caches after writes, or move caching to a shared cache such as Redis when multiple app instances exist.
- Define cache behavior for not-found and error responses.
- Add tests for page boundaries, date filters, cache hits, stale data, and post-write visibility.

Definition of Done:

- Clients can request the next page without server-side hard-coding.
- A feed is ordered according to the documented contract.
- Different users and filters never receive one another's cached results.
- Newly created content becomes visible according to a documented consistency policy.

Dependencies: Phase 1 for stable request parsing; Phase 3 for stable query and date semantics.

### Phase 6: Operational hardening (P2)

**Goal:** Make the service diagnosable and safer to operate.

Tasks:

- Validate required environment variables at startup and fail fast with actionable messages.
- Add graceful shutdown for Express and the PostgreSQL pool.
- Add structured logging with request IDs; avoid logging request secrets or full payloads.
- Add health and readiness endpoints that distinguish process health from database readiness.
- Configure body-size limits, CORS policy, security headers, and request timeouts.
- Add database migration/versioning instead of relying only on first-run Docker scripts.
- Add production configuration documentation and a supported Node.js version policy.

Definition of Done:

- Misconfiguration stops startup with a clear error.
- Shutdown closes database connections cleanly.
- Operators can correlate a request across logs and distinguish database outages from application failures.
- Schema changes are repeatable on an existing database.

Dependencies: Phases 1-3.

### Phase 7: Maintainability and scaling (P3)

**Goal:** Reduce friction as the codebase grows.

Tasks:

- Introduce a composition root so routes do not construct controllers and adapters directly.
- Keep controllers thin and move repeated route validation/error mapping into reusable middleware.
- Separate database row types from domain entities and map between them explicitly.
- Consolidate repeated post/quote feed query logic where it improves correctness without hiding query intent.
- Migrate the legacy ESLint 8/Airbnb configuration deliberately when plugin compatibility is available; do not combine this with domain changes.
- Evaluate Redis, an API gateway, ORM/query tooling, containers, and horizontal scaling only after correctness and observability are complete.

Definition of Done:

- New use cases can be tested without importing route modules or real database adapters.
- Dependency construction is centralized.
- Operational and domain changes can be made independently.

## Suggested Milestones

1. **Baseline:** route and adapter test harness plus CI checks.
2. **API correctness:** validation, field-name contract, status codes, and error middleware.
3. **Identity:** authentication, password hashing, and authorization.
4. **Data integrity:** not-found semantics, foreign keys, date handling, and typed adapters.
5. **Concurrency:** transactional daily quota.
6. **Product behavior:** pagination, merged feed decision, and cache correctness.
7. **Operations:** startup validation, shutdown, logging, health/readiness, and migrations.
8. **Scale and cleanup:** composition root, refactoring, and infrastructure evaluation.

Each milestone should be a separately reviewable change with tests and a short migration note where the API or database contract changes.

## Current Verification Baseline

At the time this plan was created:

- `npm run build` passes.
- `npm test -- --runInBand` passes: 5 suites and 20 tests.
- `npm audit --audit-level=low` reports zero vulnerabilities.
- `npx eslint src tests/` reports zero errors and existing warnings.

The most important remaining risk is not dependency security. It is untested behavior at the route, authentication, database, and concurrency boundaries.
