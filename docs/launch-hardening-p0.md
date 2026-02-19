## P0 Platform Hardening Pack (Stop-ship)

Mission: remove stop-ship security footguns and make build/CI gates trustworthy **without changing deterministic engine outputs** (tariff math, billing math, battery economics/dispatch/decision outputs).

### What changed

- **OpenAI key safety**
  - `src/config/ai-config.ts` no longer reads any `VITE_*` OpenAI key and will **never** return an API key in browser runtime.
  - `src/services/llm-insights.ts` is now **server-only** and hard-fails if it ever executes in a browser bundle.
  - Removed `dangerouslyAllowBrowser` from OpenAI client initialization.
  - Frontend pages now call **server endpoints** (`/api/ai/insights/*`) rather than importing OpenAI/LLM code directly.

- **Demo auth is explicitly demo-gated**
  - Admin “accept any password” login is now only enabled when `EVERWATT_DEMO_AUTH=1`.
  - Admin session tokens are generated with `crypto.randomBytes` instead of `Math.random`/`Date.now`.
  - Frontend no longer stores admin tokens in `localStorage` (in-memory only; refresh logs you out).

- **JWT secret fail-fast**
  - `src/services/auth-service.ts` now throws in production if `JWT_SECRET`/`AUTH_SECRET` is missing.
  - Server calls the check at startup (fail fast).

- **Build / typecheck / lint / CI**
  - Added a **ship-slice** build entry (`index.ship.html` → `src/main.ship.tsx` → `src/App.ship.tsx`) and updated `npm run build` to compile only that surface.
  - Added ESLint flat config (`eslint.config.js`) so `npm run lint` is real and runs consistently.
  - Added CI workflow `.github/workflows/ci.yml` with gates (no secrets required).

### Required production environment variables

- **JWT**
  - `JWT_SECRET` (preferred) or `AUTH_SECRET` (**required** when `NODE_ENV=production`)

- **OpenAI (server only)**
  - `OPENAI_API_KEY` (optional; enables `/api/ai/*`)

### Demo / local-only flags

- **`EVERWATT_DEMO_AUTH=1`**
  - Enables demo admin login behavior (accept any non-empty password for known demo users).
  - If unset, demo admin login returns `null` (fail closed).

### Safety rules

- **Never set `VITE_OPENAI_API_KEY`** in any deployment. This key must not exist client-side.
- All OpenAI usage must be **server-side only** (behind `/api/ai/*`).
- Admin tokens are **not persisted** (no `localStorage`); this is intentional to reduce token leakage risk.

### Commands / gates

- Unit tests: `npm run test:unit`
- Test typecheck: `npx tsc -p tsconfig.test.json --noEmit`
- Lint: `npm run lint`
- Ship build: `npm run build`
- Full build (legacy surface): `npm run build:full`
- Full typecheck (legacy surface): `npm run type-check:full`

