# Stickit.co — Sticker Shop

React + Vite storefront backed by Supabase (local Docker stack). Catalog browsing,
guest cart, and Midtrans (Snap) checkout.

## Stack

- Vite + React + React Router
- Supabase: Postgres + RLS, Edge Functions (Deno) for payments
- Midtrans Snap for IDR payments

## Running locally

1. Start the Supabase stack (Docker Desktop must be running):
   ```bash
   supabase start
   ```
2. Copy `.env.example` to `.env.local` and fill in the values `supabase start`
   prints (API URL + publishable key).
3. Apply the schema/RLS/order changes to the local DB:
   ```bash
   supabase db push
   ```
4. Run the app: `npm install` then `npm run dev`.

## Database

`supabase/migrations/20261016120000_ecommerce_schema_and_security.sql` is the
source of truth for orders. It is **idempotent** (reconciles the drifted
`products` table with `add column if not exists`) and:

- enables **RLS** on `products`, `orders`, `order_items`
- creates `orders` / `order_items`
- creates the `create_order()` RPC — the only way to place an order. It
  recomputes every price **from the DB**, never trusting the client.

> Note: your existing `products` rows were originally added outside migration
> history. If you ever run `supabase db reset`, seed data is wiped — prefer
> `supabase db push` (or `supabase migration up`) for the local DB.

## Payments (Midtrans) — manual setup

Two Edge Functions need secrets before checkout works:

- `midtrans-create-transaction` — mints a Snap token from a stored order
- `midtrans-webhook` — receives payment notifications, verifies the SHA-1
  signature, and updates the order status

**Serve locally:**
```bash
supabase functions serve midtrans-create-transaction midtrans-webhook
```

Set the function secrets (stored via the CLI / dashboard, never committed):
```bash
supabase functions secrets set MIDTRANS_SERVER_KEY=your-server-key
supabase functions secrets set MIDTRANS_ENV=sandbox
supabase functions secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
For production, run `supabase functions deploy` and flip `MIDTRANS_ENV=production`.

The browser only ever sees the **public** client key (`VITE_MIDTRANS_CLIENT_KEY`,
`VITE_MIDTRANS_ENV` in `.env.local`). The Server Key stays on the backend.

Point the Midtrans dashboard **Notification Webhook URL** to
`<project-url>/functions/v1/midtrans-webhook`. For local webhook testing you
need a public tunnel (e.g. ngrok) in front of the functions server.

Use Midtrans **Sandbox** keys and the sandbox card / VA numbers to test without
real money.

## Notes & remaining work

- **Guest-only for now.** `src/context/auth.jsx` already tracks the real
  Supabase session, so enabling email/Google auth later is a UI change, not a
  refactor. The `/login` page is an honest "guest checkout / accounts coming
  soon" screen.
- **Cart is `localStorage`.** When accounts land, add a DB cart table and sync
  it inside `CartProvider` (the reducer/API won't change).
- **Receipts** are read from a `sessionStorage` snapshot (guests can't query
  RLS-locked orders). Paid status is authoritative in the DB via the webhook.
- Flat shipping cost (`8000`) is defined in both the migration and
  `src/lib/checkout.js` — keep them in sync.

---

## Template reference (Vite)

The React Compiler is not enabled on this template because of its impact on dev
& build performance. See [react.dev](https://react.dev/learn/react-compiler/installation).
ESLint config is at `eslint.config.js` (requires `@eslint/js` and the React
plugins to be installed as devDependencies for `npx eslint` to run).
