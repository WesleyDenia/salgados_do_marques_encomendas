# Salgados Encomendas Panel

Operational web panel scaffold for the Salgados order-management MVP.

## Stack Baseline

- Next.js `15.5.9`
- React `19.1.1`
- TypeScript
- Tailwind CSS v4
- `shadcn/ui`
- `axios`
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
- pnpm

## Local Setup

Prerequisites:

- Node.js `20.x`
- `corepack` enabled
- `pnpm` `10.14.0` via the `packageManager` field in `package.json`

1. Install dependencies:

```bash
corepack enable
pnpm install
```

2. Copy the environment template and adjust the non-secret values for your machine:

```bash
cp .env.example .env.local
```

Set `SESSION_SECRET` in `.env.local` before using the panel sign-in flow.

3. Start the development server:

```bash
pnpm dev
```

4. Run the available static checks:

```bash
pnpm lint
pnpm build
```

## Project Structure

- `src/app/(auth)` for public/authentication routes
- `src/app/(shell)` for authenticated shell routes
- `src/app/api/v1` for the same-origin API boundary that will proxy `salgados-api`
- `src/components/ui` for generated `shadcn/ui` primitives
- `src/features` for domain-oriented modules
- `src/lib` for API, auth, server, formatting and printing helpers
- `tests` reserved for future unit, integration and end-to-end coverage

## Notes

- The frontend must call the local `/api/v1` boundary instead of hitting `salgados-api` directly from the browser.
- The panel login exchanges credentials with `salgados-api` through the local `/api/v1/login` boundary and stores the upstream Sanctum token only inside a signed `HttpOnly` cookie managed by Next.js.
- Authenticated proxy requests can refresh the upstream token through `/api/v1/auth/refresh` on the server when the current token expires.
- With the current backend role model, panel shell access is effectively limited to active `admin` users until broader staff roles exist server-side.
- Order, slot, permission and capacity business rules remain in the backend.
- The project is intentionally pinned to a patched Next.js `15.5.x` baseline. The current `create-next-app@latest` scaffolds Next.js 16.x, so version changes must remain explicit.
