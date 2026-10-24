# Stickit.co — Sticker Shop

React + Vite storefront backed by Supabase. Catalog browsing, a local cart,
email/password accounts, and Midtrans (Snap) checkout with meet-up handover.

## Stack

- Vite + React + React Router
- Supabase: Postgres + RLS, Auth, Edge Functions (Deno) for payments
- Midtrans Snap for IDR payments
- Netlify for the static frontend (`netlify.toml` at the repository root)

## Running locally

1. Start the Supabase stack (Docker Desktop must be running):
   ```bash
   supabase start
   ```
2. Copy `.env.example` to `.env.local` and fill in the values `supabase start`
   prints (API URL + publishable key). Midtrans needs a sandbox client key for
   checkout.
3. Apply pending local migrations:
   ```bash
   supabase db push --local
   ```
4. Run the app: `npm install` then `npm run dev`.

> Do **not** run `supabase db reset` against a database that contains your
> product catalog; it wipes the rows. The migrations intentionally never seed
> the real catalog.

## Database

The catalog is the hand-built `products` table, keyed by the unique text
`productCode` (there is no `id`) with:

- `category`, `packed` (`individual` | `group`), `price`, `imagePath`
- `availability` — false once a unique individual sticker is reserved

Migrations:

- `20260913110740_create_products.sql` — legacy bootstrap table.
- `20261019000000_ecommerce.sql` — adds the catalog columns, public catalog
  read policy, `orders` / `order_items` / `profiles`, and the original
  `create_order()` RPC.
- `20261022081119_initial_schema.sql` — reconciles the hand-built catalog
  (safe `IF EXISTS` / no-op on databases that already dropped `id`/`name`).
- `20261024000000_harden_checkout.sql` — hardened `create_order()` (availability,
  quantity and duplicate checks) plus `apply_payment_status()`, which releases
  unique sticker reservations on failed/expired payments and ignores late or
  duplicate webhook notifications.

`create_order()` is the only way to place an order. It requires a signed-in
user, recomputes every price from the database, locks each product row, and
flips individual stickers to `availability = false`. `apply_payment_status()`
is executable only by `service_role` (the webhook).

### Applying to the hosted Supabase project

Review and apply migrations deliberately; never overwrite production data:

```bash
supabase migration list          # compare local vs remote first
supabase db push                 # applies only migrations the project is missing
```

At the time of the pre-launch audit, the hosted project only recorded
`20260913110740` and was missing the `orders`, `order_items`, `profiles` and
RPC objects. Verify with `supabase migration list` before deploying the
frontend; checkout cannot work until the e-commerce migration is applied.

## Payments (Midtrans)

Two Edge Functions:

- `midtrans-create-transaction` — verifies the signed-in user owns the pending
  order, recomputes the amount from the DB (including shipping), and mints a
  Snap token.
- `midtrans-webhook` — verifies the SHA-1 signature, then calls
  `apply_payment_status()` to update the order atomically.

Function JWT settings live in `supabase/config.toml`:

- `midtrans-create-transaction`: `verify_jwt = true`
- `midtrans-webhook`: `verify_jwt = false` (Midtrans cannot send a Supabase JWT;
  the SHA-1 signature authenticates the request)

Deploy and configure:

```bash
supabase functions deploy midtrans-create-transaction
# The webhook is called by Midtrans, not by a Supabase user, so it must not
# require a Supabase JWT. The function authenticates with the SHA-1 signature.
supabase functions deploy midtrans-webhook --no-verify-jwt
supabase functions secrets set MIDTRANS_SERVER_KEY=your-server-key
supabase functions secrets set MIDTRANS_ENV=production
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase; do not
put them in any `VITE_` variable. The browser only sees the public Midtrans
client key.

Point the Midtrans dashboard **Notification Webhook URL** to:

```text
https://<project-ref>.supabase.co/functions/v1/midtrans-webhook
```

Set the Supabase Auth **Site URL** to the Netlify URL and add it to the redirect
allow-list before testing sign-up confirmation emails.

## Netlify deployment

The repository root contains `netlify.toml` with:

- Base directory: `trial-101`
- Build command: `npm run build`
- Publish directory: `dist`
- Node: `22`
- SPA fallback: `/* → /index.html` (200)
- Security and immutable-asset headers

Set these Netlify environment variables before the first build:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (or anon) key |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans client key (public) |
| `VITE_MIDTRANS_ENV` | `production` |

The Vite config fails the production build if the Supabase variables or a
production Midtrans client key are missing, so a misconfigured deploy fails in
the build log instead of rendering a blank page.

### Post-deploy smoke test

1. Open `/home`, `/shopping/doraemon`, `/cart` and refresh each URL directly.
2. Sign up / sign in, then reload to confirm the session persists.
3. Add a sticker to the cart and reach checkout.
4. Complete a sandbox payment and confirm the receipt plus the order status in
   Supabase.
5. Send a test Midtrans notification and confirm the webhook updates the order.

## Notes & remaining work

- **Accounts are required for checkout.** The cart itself remains
  `localStorage`; syncing it to an account is future work.
- **Receipts** use a `sessionStorage` snapshot. Payment status in the database
  is authoritative; the webhook updates it.
- **A closed payment window** retries the same pending order from checkout.
  If Midtrans rejects a second Snap session for the same `order_id`, a
  dedicated payment-attempt table/token cache may be needed.
- Flat shipping cost (`4500`) is defined in both
  `20261019000000_ecommerce.sql` / `20261024000000_harden_checkout.sql` and
  `src/lib/checkout.js` — keep them in sync.
- Product images live in `public/outputFiles` (~48 MB). They are lazy-loaded,
  but generating smaller thumbnails would reduce mobile data use.
- ESLint is not configured with its missing dev dependencies; `npm run build`
  and `npm audit` are the available checks today.

---

## Template reference (Vite)

The React Compiler is not enabled on this template because of its impact on dev
& build performance. See [react.dev](https://react.dev/learn/react-compiler/installation).
ESLint config is at `eslint.config.js` (requires `@eslint/js` and the React
plugins to be installed as devDependencies for `npx eslint` to run).
