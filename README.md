# Bazzaro

Bazzaro is an original Nepal-focused multi-vendor marketplace experience. It is intentionally its own brand and visual system, rather than a copy of MitKart, Daraz, or another marketplace.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

The local infrastructure services are available through Docker Compose:

```bash
docker compose up -d
```

This starts PostgreSQL, Redis and MinIO. The Prisma contract lives at `prisma/schema.prisma`; it is designed for a modular monolith that can split into services later.

## Routes

- `/` — customer storefront with search, category filtering, quick view, wishlist, cart, checkout steps, location selection, account modal and newsletter interaction
- `/account` — customer account, recent orders, saved finds and support shortcuts
- `/vendor` — vendor workspace with sales, order status, inventory and revenue views
- `/admin` — admin workspace with marketplace revenue, category mix, approvals, top products and finance tasks

## Architecture foundations

- `prisma/schema.prisma` — normalized PostgreSQL contract for users, RBAC, vendors, products, variants, inventory transactions, carts, orders, payments, coupons, flash sales, reviews, returns, refunds, shipments, notifications, support, wallets, withdrawals, CMS and audit logs.
- `lib/api.ts` — typed browser API client with consistent error envelopes and HTTP-only cookie credentials.
- `lib/validation.ts` — shared Zod validation for auth, carts, checkout and returns.
- `lib/payments.ts` — provider interface for eSewa, Khalti, Fonepay and COD. Gateway secrets remain server-side; redirect results are not treated as payment proof.
- `.env.example` — development configuration template; secrets are not committed.
- `docker-compose.yml` — local PostgreSQL, Redis and S3-compatible MinIO services.

## Product decisions

- NPR pricing is used throughout the interface and Kathmandu Valley is the initial delivery location.
- The interface uses original Bazzaro typography, colors, navigation, photography treatment and seller storytelling.
- The storefront currently uses curated local demo data so the experience is usable without credentials. The API boundary and database contract are ready for wiring into a NestJS modular monolith.
- Payment, inventory and order lifecycle rules must be enforced in the server transaction layer before connecting production providers. The front end deliberately does not claim a real gateway payment or expose payment secrets.

## Quality checks

```bash
npm run build
```

The build is configured for the Next.js App Router and binds the dev server to `0.0.0.0` for preview environments.
