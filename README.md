# 414 Jewels storefront

A static storefront with a Supabase-backed product catalog and admin dashboard.

## Current launch status

- The storefront and admin dashboard are in the repository.
- `supabase_setup.sql` creates the product and variant tables and their access policies. It does not add demo products.
- Product catalog, product photos, prices, stock, shipping/return terms, and contact details still need to be entered and checked by the owner.
- The current customer path is an order request through Tally. Card checkout is not connected.
- Cloudflare Pages deployment is not configured by this repository. See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).
- Follow [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before accepting real orders.

## Files

- `index.html` — storefront
- `admin.html` — admin dashboard
- `styles.css` — shared styles
- `storefront.js` — catalog and product options
- `admin.js` — admin login and catalog editor
- `config.js` — public Supabase and contact configuration
- `supabase_setup.sql` — idempotent database and row-level security setup

## Supabase setup

1. Create a Supabase project.
2. Run the complete `supabase_setup.sql` in the SQL Editor.
3. Create the owner's account in Supabase Authentication.
4. Add that account's user UUID to `public.admins` using the SQL instructions in the setup file.
5. In `config.js`, set the Supabase Project URL and publishable/anon key. These values are intended for browser use; never put a service-role key in this file.
6. Sign into `/admin.html`, add real products, variants, prices, images, and exact stock counts, then check the storefront in a private browser window.

The setup script removes no existing product data and inserts no sample products. Review the script and back up important data before applying schema changes to an existing store.

## Current order path

Customers choose an item and submit the Tally order request. The owner must confirm exact inventory, shipping cost/timing, final total, and payment method with the customer before fulfillment. Do not describe this as instant checkout.

## Brand and listing accuracy

Use factual material, plating, dimensions, condition, and care details supplied by the manufacturer or verified by the owner. Do not use protected brand names or imply authenticity unless the item is authentic and the claim can be substantiated. Use only product images the business owns or is authorized to use.
