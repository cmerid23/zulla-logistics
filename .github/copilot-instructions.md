# Zulla Logistics — Copilot / Claude Instructions

## Project overview
Freight broker SaaS. PWA frontend + Express API + PostgreSQL. Connects shippers, carriers,
agents, and admins around loads, quotes, tracking, documents, and invoicing.

## Stack (NON-NEGOTIABLE)
- **Frontend**: React 18, Vite, TypeScript, Tailwind, Zustand, Framer Motion,
  React Router v6, TanStack Query v5, vite-plugin-pwa, Workbox, Mapbox GL JS,
  Recharts, jsPDF, React Hook Form, Zod
- **Backend**: Node.js 20, Express 5, TypeScript, Drizzle ORM, node-postgres,
  jsonwebtoken, bcryptjs, Zod, Multer, node-cron,
  @aws-sdk/client-s3 + s3-request-presigner (Cloudflare R2),
  @anthropic-ai/sdk, resend, twilio, web-push
- **Database**: PostgreSQL (Railway plugin)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Stripe
- **Deploy**: Railway — `web` and `api` services + PostgreSQL plugin
- **Package manager**: pnpm monorepo (workspaces in `apps/*`, `packages/*`)

## Workspace layout
```
apps/web   — React PWA (Vite)
apps/api   — Express API
packages/db     — Drizzle schema + pg client (@zulla/db)
packages/shared — types, constants, Zod schemas (@zulla/shared)
packages/ui     — framework-agnostic UI helpers (@zulla/ui)
```

## Commands
- `pnpm install` — install
- `pnpm dev` — run web + api in parallel
- `pnpm dev:web` / `pnpm dev:api`
- `pnpm build` — typecheck + build all packages
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:studio`

## Conventions
- All packages are `"type": "module"`, ESM-only.
- Cross-package imports use `@zulla/*` workspace names.
- Server routes return `{ ok: true, data }` or `{ ok: false, error }` (`ApiResponse<T>` in `@zulla/shared`).
- Validate every request with the Zod schemas in `@zulla/shared/schemas`.
- Money is stored in cents as integers. Format with `formatMoneyCents`.
- IDs are UUIDs (Postgres `gen_random_uuid()`).

## Env
See `.env.example`. Important: `DATABASE_URL`, `JWT_SECRET`, R2 keys, Stripe keys,
Anthropic key, VAPID keys, Mapbox token (`VITE_MAPBOX_TOKEN`).

## Don't
- Don't introduce Next.js, NestJS, Prisma, or Socket.io. The stack is fixed.
- Don't add ORMs other than Drizzle. Don't switch from pg to a different driver.
- Don't store secrets or PII in client code.
