# AGENTS.md

## Commands

```sh
npm run build         # Build with Babel to dist/
npm run dev           # Dev server with hot reload (ts-node-dev)
npm run test          # Jest with dotenv/config
```

## Dependencies

- **Docker required**: Run `docker-compose up -d` before tests/dev (PostgreSQL on port 5432)
- Tests require `.env` with `DB_CONNECTION=postgres://postgres:passworddb@localhost:5432/postgres`

## Architecture

- `src/server.ts` - Entry point
- Clean Architecture: `entities/` → `usecases/` → `controllers/` → `routes/` → `infra/`
- Entities: `Post`, `User`, `Quote`
- Adapters use `pg-promise`, no ORM

## Testing

- Jest + ts-jest, coverage in `coverage/` directory
- Tests are integration-style (hit real DB adapter)
- Excluded from coverage: `src/envs/`, `node_modules/`

## Linting

- ESLint extends airbnb-base + typescript-eslint
- Run manually: `npx eslint src/ tests/`

## Git Workflow

**Before every commit, verify the current branch:**

```sh
git branch --show-current
```

- If on `master`/`main`, **STOP** and create a feature branch first:
  ```sh
  git checkout -b feature/your-feature-name
  ```
- **Never push directly to `master` or `main`** - always PR through a feature branch
- Use GitFlow-style branches: `feature/*`, `fix/*`, `hotfix/*`
- Commit only on feature branches; PR to `master` for integration